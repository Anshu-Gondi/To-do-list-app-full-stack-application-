const mongoose = require('mongoose');
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // Ensure this is imported
const bcrypto = require('bcryptjs');

// Jwt Secrets
const jwtSecret = process.env.JWT_SECRET || "Vw7!yA@9hZ#5$dBmN3%xT&JpQ6^rEk*Lf";
const REFRESH_TOKEN_EXPIRY_DAYS = parseInt(process.env.REFRESH_EXPIRY_DAYS) || 10;

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        minlength: 1,
        trim: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    sessions: [{
        token: {
            type: String,
            required: true
        },
        expirytime: {
            type: Number,
            required: true
        }
    }]
});

// *** Instance methods ***
UserSchema.methods.toJSON = function () {
    const user = this;
    const userObject = user.toObject();

    // return the document except the password and sessions (these shouldn't be made available)
    return _.omit(userObject, ['password', 'sessions']);
};

UserSchema.methods.generateAccessAuthToken = function () {
    const user = this;
    return new Promise((resolve, reject) => {
        // Create the JSON Web Token and return that
        jwt.sign({ _id: user._id.toHexString() }, jwtSecret, { expiresIn: "15m" }, (err, token) => {
            if (!err) {
                resolve(token);
            } else {
                reject(err);
            }
        });
    });
};

UserSchema.methods.generateSessionToken = function () {
    // This method generates a 64-byte hex string
    return new Promise((resolve, reject) => {
        crypto.randomBytes(64, (err, buf) => {
            if (!err) {
                let token = buf.toString('hex'); // Fixed case of "toString"
                resolve(token);
            } else {
                reject(err);
            }
        });
    });
};

UserSchema.methods.generateRefreshAuthToken = function () {
    let user = this;

    // Generate a session token (refresh token)
    return user.generateSessionToken().then((refreshToken) => {
        return refreshToken;
    });
};

UserSchema.methods.createSession = function () {
    let user = this;
    return user.generateRefreshAuthToken().then((refreshToken) => {
        return saveSessionToDatabase(user, refreshToken);
    }).then((refreshToken) => {
        // saved to datatbase successfully
        // now return the refresh token
        return refreshToken;
    }).catch((e) => {
        return Promise.reject('Failed to save session to database.\n' + e);
    })
}

/* Model Methods (static methods) */

UserSchema.statics.getJWTSecret = () => {
    return jwtSecret;
}

UserSchema.statics.findByIdAndToken = function (_id, token) {
    // finds the user by id and token 
    // used in auth middleware (verifySession)

    const user = this;

    return user.findOne({
        _id,
        'sessions.token': token
    });
}

UserSchema.statics.findByCredentials = function (email, password) {
    let user = this;
    return user.findOne({ email }).then((user) => {
        if (!user) return Promise.reject();

        return new Promise((resolve, reject) => {
            bcrypto.compare(password, user.password, (err, res) => {
                if (res) resolve(user);
                else {
                    reject();
                }
            })
        })
    })
}

UserSchema.statics.hasRefreshTokenExpired = (expiresAt) => {
    let secondsSinceEpoch = Date.now() / 1000;
    if (expiresAt > secondsSinceEpoch) {
        //hasn't expired
        return false
    } else {
        //has expired
        return true
    }
}

/* MIDDLEWARE */
// Before a user document is saveSessionToDatabase, this code runs
UserSchema.pre('save', function (next) {
    let user = this;
    let costFactor = 10;

    if (user.isModified('password')) {
        // If the password field has been edited/changed, run this code.
        bcrypto.genSalt(costFactor, (err, salt) => {
            if (err) return next(err); // Pass the error to next middleware

            bcrypto.hash(user.password, salt, (err, hash) => {
                if (err) return next(err); // Pass the error to next middleware

                user.password = hash;
                next(); // Proceed after hashing
            });
        });
    } else {
        next(); // Proceed if the password is not modified
    }
});


/* Helper Methods */
let saveSessionToDatabase = (user, refreshToken) => {
    // Save session to database
    return new Promise((resolve, reject) => {
        let expiresAt = generateRefreshTokenExpiryTime();

        user.sessions.push({ 'token': refreshToken, expirytime: expiresAt });

        user.save().then(() => {
            // saved session successfully
            return resolve(refreshToken);
        }).catch((e) => {
            reject(e);
        })
    })
}

let generateRefreshTokenExpiryTime = () => {
    let secondsUntilExpire = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60;
    return Math.floor(Date.now() / 1000) + secondsUntilExpire;
};

// Export the model
const User = mongoose.model('User', UserSchema);

module.exports = { User };
