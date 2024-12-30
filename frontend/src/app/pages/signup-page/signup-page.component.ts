import { Component } from '@angular/core';
import { AuthService } from '../../auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { loadGapiInsideDOM } from 'gapi-script';
import { environment } from '../../../client/environment';

@Component({
  selector: 'app-signup-page',
  imports: [RouterLink],
  templateUrl: './signup-page.component.html',
  styleUrls: ['./signup-page.component.scss'],
})
export class SignupPageComponent {
  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.initGoogleSignIn();
  }

  initGoogleSignIn() {
    loadGapiInsideDOM().then(() => {
      gapi.load('auth2', () => {
        gapi.auth2.init({
          client_id: environment.googleClientId,
          cookie_policy: 'single_host_origin',
        });
      });
    });
  }

  signInWithGoogle() {
    const auth2 = gapi.auth2.getAuthInstance();
    auth2.signIn().then((googleUser: gapi.auth2.GoogleUser) => {
      const idToken = googleUser.getAuthResponse().id_token;

      // Pass the token to the AuthService
      this.authService.googleSignIn(idToken).subscribe({
        next: () => {
          this.router.navigate(['lists']);
        },
        error: (error) => {
          console.error('Google Sign-In failed:', error);
        },
      });
    });
  }

  onSignupButtonClicked(email: string, password: string) {
    this.authService.signup(email, password).subscribe({
      next: (response: any) => {
        console.log('Signup successful:', response);
        // Navigate to the login page after signup
        this.router.navigate(['login']);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Signup failed:', err.message);
      },
    });
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }
}
