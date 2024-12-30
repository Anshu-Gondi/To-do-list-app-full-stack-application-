import { Component } from '@angular/core';
import { AuthService } from '../../auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../client/environment';
import { loadGapiInsideDOM} from 'gapi-script';

@Component({
  selector: 'app-login-page',
  imports: [RouterLink],
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss'],
})
export class LoginPageComponent {
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

  onLoginButtonClicked(email: string, password: string) {
    this.authService.login(email, password).subscribe({
      next: (response: any) => {
        console.log('Login successful:', response);
        this.router.navigate(['lists']);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Login failed:', err.message);
      },
    });
  }

  navigateToSignup() {
    this.router.navigate(['/signup']);
  }
}

