const express = require("express");
const app = express();
require("dotenv").config();
const bodyParser = require("body-parser");

const { mongoose } = require("./db/mongoose");

const port = process.env.PORT || 3000;

// Load in the mongoose models
const { List, Task, User } = require("./db/models/index");

//jwt module import 
const jwt = require('jsonwebtoken');

/* MIDDLEWARE */

// Load middleware
app.use(bodyParser.json());

// CORS HEADERS MIDDLEWARE
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:4200"); // Allow requests from your Angular app
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS" // Include HTTP methods your API supports
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200); // Respond OK for preflight requests
  }

  next();
});

/**
 * Middleware to authenticate users via JWT token
 * Purpose: Ensure the user is authenticated by validating the JWT token
 */
const authenicate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', ''); // Extract token from header

  if (!token) {
    return res.status(401).send({ error: 'Authorization token missing' }); // Handle missing token
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Ensure JWT_SECRET is set
    req.user_id = decoded._id; // Add user id to request for further use
    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error("Authentication Error:", error); // Log the error for debugging
    res.status(401).send({ error: 'Invalid or expired token' }); // Handle invalid/expired token
  }
};


// Verify refresh Token Middleware (which will be verifying the session)
let VerifySession = (req, res, next) => {
  // Normalize header keys to handle potential case mismatches
  const refreshToken = req.header('x-refresh-token') || req.header('refreshToken');
  const _id = req.header('_id') || req.header('x-id');

  // Validate if both headers are present
  if (!refreshToken || !_id) {
    return res.status(400).json({ error: 'Refresh token and user ID are required' });
  }

  // Find the user by ID and refresh token
  User.findByIdAndToken(_id, refreshToken)
    .then((user) => {
      if (!user) {
        // User couldn't be found
        return Promise.reject({
          error: 'User not found. Make sure that the refresh token and user ID are correct',
        });
      }

      // Check if the session is valid
      const isSessionValid = user.sessions.some((session) => {
        return (
          session.token === refreshToken &&
          !User.hasRefreshTokenExpired(session.expirytime) // Fix typo: 'expiresAt' to 'expirytime'
        );
      });

      if (isSessionValid) {
        // Attach user details to the request object
        req.user_id = user._id;
        req.refreshToken = refreshToken;
        req.userObject = user;
        next();
      } else {
        return Promise.reject({
          error: 'Refresh token has expired or the session is invalid',
        });
      }
    })
    .catch((err) => {
      res.status(401).json(err);
    });
};

/* END MIDDLEWARE */

// Route  Handlers

// List Routes

/**
 * GET /lists
 * Purpose: Get all lists
 */
app.get("/lists", authenicate, (req, res) => {
  // Return an array of all the lists in the database that belong to the authenicated user
  List.find({
    _userId: req.user_id
  })
    .then((lists) => {
      res.status(200).send(lists); // Send the lists with a 200 OK status
    })
    .catch((err) => {
      console.error("Error fetching lists:", err); // Log the error for debugging
      res.status(500).send({ error: "Unable to fetch lists" }); // Send an error response
    });
});

/**
 * POST /lists
 * Purpose: Create a new list
 */
app.post("/lists", authenicate, (req, res) => {
  // we want to create a new list in the database (which include id)
  // the list information (fields) will be passed in via the JSON request body
  let title = req.body.title;

  let newList = new List({
    title,
    _userId: req.user_id
  });
  // Save the new list to the database
  newList
    .save()
    .then((listDoc) => {
      // Respond with the full list document, including the ID
      res.status(201).send(listDoc); // HTTP 201: Created
    })
    .catch((error) => {
      // Handle potential errors during save operation
      console.error(error);
      res.status(500).send({ error: "Internal Server Error" });
    });
});

/**
 * PATCH /lists/:id
 * Purpose: Update a list
 */
app.patch("/lists/:id", authenicate, async (req, res) => {
  try {
    // Validate incoming ID
    const listId = req.params.id;
    if (!listId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).send({ error: "Invalid ID format" });
    }

    // Perform the update operation ensuring the authenticated user owns the list
    const updatedList = await List.findOneAndUpdate(
      { _id: listId, _userId: req.user_id }, // Ensure list belongs to the authenticated user
      { $set: req.body },
      { new: true } // Return the updated document
    );

    // Check if a list was found and updated
    if (!updatedList) {
      return res.status(404).send({ error: "List not found or unauthorized" });
    }

    // Respond with OK message
    res.status(200).send(updatedList); // Send the updated list in the response
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

/**
 * DELETE /lists/:id
 * Purpose: Create a new list
 */
app.delete("/lists/:id", authenicate, async (req, res) => {
  try {
    // Validate incoming ID
    const listId = req.params.id;
    if (!listId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).send({ error: "Invalid ID format" });
    }

    // Perform the delete operation ensuring the authenticated user owns the list
    const removedListDoc = await List.findOneAndDelete({
      _id: listId,
      _userId: req.user_id // Ensure list belongs to the authenticated user
    });

    // Check if a list was actually deleted
    if (!removedListDoc) {
      return res.status(404).send({ error: "List not found or unauthorized" });
    }

    // Call deleteTasksFromList to delete tasks in the removed list
    await deleteTasksFromList(removedListDoc._id);

    // Respond with the deleted list document
    res.status(200).send(removedListDoc);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

// Function to delete all tasks associated with a given list ID
async function deleteTasksFromList(listId) {
  try {
    await Task.deleteMany({ listId }); // Assuming tasks have a `listId` field
  } catch (error) {
    console.error(`Error deleting tasks for list ${listId}:`, error);
    throw error; // Rethrow the error to handle it in the calling function
  }
}


// Task Routes

/**
 * GET /lists/:listid/tasks
 * Purpose: Get all tasks from specific list
 */
app.get("/lists/:listId/tasks", authenicate, async (req, res) => {
  const { listId } = req.params;

  // Validate listId
  if (!mongoose.Types.ObjectId.isValid(listId)) {
    return res.status(400).send({ error: "Invalid listId" });
  }

  try {
    // Find tasks belonging to the specified listId
    const tasks = await Task.find({ _listId: listId });

    // Check if tasks exist
    if (!tasks || tasks.length === 0) {
      return res
        .status(404)
        .send({ message: "No tasks found for this listId" });
    }

    // Send tasks if found
    res.status(200).send(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).send({ error: "Server error" });
  }
});

/**
 * POST /lists/:listId/tasks
 * Purpose: Create a new task in a specific list
 */
app.post("/lists/:listId/tasks", authenicate, async (req, res) => {
  const { listId } = req.params;
  const { title } = req.body;

  try {
    // Validate listId format
    if (!mongoose.Types.ObjectId.isValid(listId)) {
      return res.status(400).send({ error: "Invalid listId format" });
    }

    // Validate title
    if (!title || typeof title !== "string") {
      return res.status(400).send({ error: "Invalid or missing title" });
    }

    // Check if the list exists and belongs to the authenticated user
    const list = await List.findOne({
      _id: listId,
      _userId: req.user_id,
    });

    if (!list) {
      return res.status(404).send({ error: "List not found or unauthorized" });
    }

    // Create and save the new task
    const newTask = new Task({
      title,
      _listId: listId,
    });

    const newTaskDoc = await newTask.save();
    res.status(201).send(newTaskDoc); // Send response with 201 status for created resource
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

/**
 * UPDATE /lists/:listId/tasks/:taskId
 * Purpose: To update a task from a list
 */
app.patch("/lists/:listId/tasks/:taskId", authenicate, async (req, res) => {
  const { listId, taskId } = req.params;

  try {
    // Validate listId format
    if (!mongoose.Types.ObjectId.isValid(listId)) {
      return res.status(400).send({ error: "Invalid listId format" });
    }

    // Validate taskId format
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).send({ error: "Invalid taskId format" });
    }

    // Check if the list exists and belongs to the authenticated user
    const list = await List.findOne({
      _id: listId,
      _userId: req.user_id, // Ensure the authenticated user owns the list
    });

    if (!list) {
      return res.status(404).send({ error: "List not found or unauthorized" });
    }

    // Update the task if it belongs to the list
    const updatedTask = await Task.findOneAndUpdate(
      { _id: taskId, _listId: listId }, // Ensure the task belongs to the specified list
      { $set: req.body },
      { new: true, runValidators: true } // Return the updated task and validate the changes
    );

    if (!updatedTask) {
      return res.status(404).send({ error: "Task not found or unauthorized" });
    }

    res.status(200).send({ message: "Task updated successfully", updatedTask });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

/**
 * DELETE /lists/:listId/tasks/:taskId
 * Purpose: To delete a task from a list
 */
app.delete("/lists/:listId/tasks/:taskId", authenicate, async (req, res) => {
  const { listId, taskId } = req.params;

  try {
    // Validate listId format
    if (!mongoose.Types.ObjectId.isValid(listId)) {
      return res.status(400).send({ error: "Invalid listId format" });
    }

    // Validate taskId format
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).send({ error: "Invalid taskId format" });
    }

    // Check if the list exists and belongs to the authenticated user
    const list = await List.findOne({
      _id: listId,
      _userId: req.user_id, // Ensure the authenticated user owns the list
    });

    if (!list) {
      return res.status(404).send({ error: "List not found or unauthorized" });
    }

    // Find and delete the task
    const removedTaskDoc = await Task.findOneAndDelete({
      _id: taskId,
      _listId: listId, // Ensure the task belongs to the specified list
    });

    if (!removedTaskDoc) {
      return res.status(404).send({ error: "Task not found or unauthorized" });
    }

    res.status(200).send({ message: "Task deleted successfully", removedTaskDoc });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

// USER ROUTES
/**
 * POST /users
 * Purpose: Sign Up
 */
app.post('/users', (req, res) => {
  const body = req.body;

  if (!body.email || !body.password) {
    return res.status(400).send({ error: "Email and password are required" });
  }

  const newUser = new User(body);

  User.findOne({ email: body.email })
    .then((existingUser) => {
      if (existingUser) {
        return Promise.reject({ error: "Email already exists" });
      }
      return newUser.save();
    })
    .then(() => newUser.createSession())
    .then((refreshToken) => {
      return newUser.generateAccessAuthToken().then((accessToken) => {
        return { accessToken, refreshToken };
      });
    })
    .then((authTokens) => {
      const sanitizedUser = newUser.toObject();
      delete sanitizedUser.password; // Ensure password is not sent in the response

      res
        .header('x-refresh-token', authTokens.refreshToken)
        .header('x-access-token', authTokens.accessToken)
        .send(sanitizedUser);
    })
    .catch((e) => {
      console.error("Error:", e);
      res.status(400).send({ error: e.message || e });
    });
});

/**
 * POST /users/login
 * Purpose: Login
 */
app.post('/users/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send({ error: "Email and password are required" });
  }

  User.findByCredentials(email, password)
    .then((user) => {
      return user.createSession().then((refreshToken) => {
        return user.generateAccessAuthToken().then((accessToken) => {
          return { accessToken, refreshToken, user };
        });
      });
    })
    .then(({ accessToken, refreshToken, user }) => {
      const sanitizedUser = user.toObject();
      delete sanitizedUser.password; // Remove password before sending response

      res
        .header('x-refresh-token', refreshToken)
        .header('x-access-token', accessToken)
        .send({
          _id: sanitizedUser._id,
          email: sanitizedUser.email,
          accessToken,
          refreshToken,
        });
    })
    .catch((e) => {
      console.error("Login Error:", e);
      res.status(400).send({ error: "Invalid email or password" });
    });
});

/**
 * GET /users/me/access-token
 * Purpose: generates and return an access token
 */
app.get('/users/me/access-token', VerifySession, (req, res) => {
  // we know that the user/caller is quthenticated and we have the user_id and user object available to us
  req.userObject
    .generateAccessAuthToken()
    .then((accessToken) => {
      res.set('x-access-token', accessToken).send({ accessToken });
    })
    .catch((e) => {
      res.status(400).send({ error: 'Failed to generate access token', details: e });
    });
})

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
