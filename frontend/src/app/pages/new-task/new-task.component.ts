import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { TaskService } from '../../task.service';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-new-task',
  imports:[RouterLink],
  templateUrl: './new-task.component.html',
  styleUrls: ['./new-task.component.scss'],
})
export class NewTaskComponent implements OnInit {
  listId!: string; // Use definite assignment assertion

  constructor(private taskService: TaskService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    // Subscribe to route parameters to get the listId
    this.route.params.subscribe((params: Params) => {
      this.listId = params['listId'];
      console.log(this.listId);
    });
  }

  createTask(title: string): void {
    if (!title.trim()) {
      alert('Task title cannot be empty.');
      return;
    }

    this.taskService.createTasks(title, this.listId).subscribe({
      next: (response: any) => {
        this.router.navigate(['../'], { relativeTo: this.route }); // Navigate to the parent route
      },
      error: (error: any) => {
        console.error('Error creating task:', error);
        alert('Failed to create task. Check console for details.');
      },
    });
  }
}
