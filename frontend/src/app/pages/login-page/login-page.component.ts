import { Component } from '@angular/core';
import { AuthService } from '../../auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login-page',
  imports: [RouterLink],
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss'],
})
export class LoginPageComponent {
  constructor(private authService: AuthService, private router: Router) {}

  onLoginButtonClicked(email: string, password: string) {
    this.authService.login(email, password).subscribe({
      next: (response: any) => {
        console.log('Login successful:', response);
        // Navigate to the 'lists' route
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
