import { Component } from '@angular/core';
import { AuthService } from '../../auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-signup-page',
  imports: [RouterLink],
  templateUrl: './signup-page.component.html',
  styleUrl: './signup-page.component.scss',
})
export class SignupPageComponent {
  constructor(private authService: AuthService, private router: Router) {}

  onSignupButtonClicked(email: string, password: string) {
    this.authService.signup(email, password).subscribe({
      next: (response: any) => {
        console.log('Login successful:', response);
        // Navigate to the 'lists' route
        this.router.navigate(['login']);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Login failed:', err.message);
      },
    });
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }
}
