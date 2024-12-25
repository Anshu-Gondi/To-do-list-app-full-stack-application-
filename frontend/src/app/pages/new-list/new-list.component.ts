import { Component } from '@angular/core';
import { TaskService } from '../../task.service';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { List } from '../../models/list.model';

@Component({
  selector: 'app-new-list',
  standalone: true,
  templateUrl: './new-list.component.html',
  styleUrls: ['./new-list.component.scss'],
  imports: [RouterLink],
})
export class NewListComponent {
  constructor(private taskService: TaskService, private router: Router) {}

  createList(title: string): void {
    // Validate the title to ensure it's not empty
    if (!title.trim()) {
      alert('List title cannot be empty.');
      return;
    }

    this.taskService.createList(title).subscribe({
      next: (response: List) => {
        console.log('List created successfully:', response);
        // Navigate to /lists/response._id
        this.router.navigate(['/lists', response._id]);
      },
      error: (error: any) => {
        console.error('Error creating list:', error);
        alert('Failed to create list. Check console for details.');
      },
    });
  }
}

