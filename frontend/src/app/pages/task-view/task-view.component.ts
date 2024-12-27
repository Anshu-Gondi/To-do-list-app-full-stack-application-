import { Component, OnInit } from '@angular/core';
import { TaskService } from '../../task.service';
import {
  ActivatedRoute,
  Params,
  Router,
  RouterLink,
  RouterModule,
} from '@angular/router';
import { CommonModule } from '@angular/common';
import { List } from '../../models/list.model';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-task-view',
  imports: [RouterLink, CommonModule, RouterModule],
  templateUrl: './task-view.component.html',
  styleUrls: ['./task-view.component.scss'],
})
export class TaskViewComponent implements OnInit {
  lists: List[] = []; // Array of lists
  tasks: Task[] = []; // Array of tasks
  listId: string | null = null; // Nullable listId

  constructor(
    private taskService: TaskService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to route parameters to get the listId
    this.route.params.subscribe((params: Params) => {
      this.listId = params['listId'] || null;

      if (this.listId) {
        // Fetch tasks for the selected list
        this.fetchTasks(this.listId);
      } else {
        this.tasks = []; // No tasks to display
      }
    });

    // Fetch all lists
    this.fetchLists();
  }

  fetchLists(): void {
    this.taskService.getLists().subscribe(
      (lists: List[]) => {
        this.lists = lists;
      },
      (error) => {
        if (error.status === 401) {
          console.error(
            'Unauthorized: Access token might be invalid or expired.'
          );
        } else {
          console.error('Error fetching lists:', error);
        }
      }
    );
  }

  fetchTasks(listId: string): void {
    this.taskService.getTasks(listId).subscribe(
      (tasks: Task[]) => {
        this.tasks = tasks;
      },
      (error) => {
        console.error('Error fetching tasks:', error);
      }
    );
  }

  onTaskClick(task: Task): void {
    // We want to set the task to complete
    this.taskService.complete(task).subscribe(() => {
      task.completed = !task.completed;
    });
  }

  onDeleteListClick(): void {
    if (this.listId) {
      const confirmation = confirm(
        'Are you sure you want to delete this list and all its tasks?'
      );
      if (confirmation) {
        this.taskService.deleteList(this.listId).subscribe(
          () => {
            this.lists = this.lists.filter((list) => list._id !== this.listId);
            this.listId = null;
            this.tasks = [];
            alert('List deleted successfully.');

            // Navigate to the home route or a specific fallback route after deletion
            this.router.navigate(['/lists']);
          },
          (error) => {
            console.error('Error deleting list:', error);
            alert('Failed to delete the list. Please try again.');
          }
        );
      }
    } else {
      alert('No list selected to delete.');
    }
  }

  givem(taskId: string): void {
    if (!taskId) {
      alert('Task ID is required to delete the task.');
      return;
    }

    const confirmation = confirm('Are you sure you want to delete this task?');
    if (confirmation) {
      this.taskService.deleteTask(this.listId!, taskId).subscribe(
        () => {
          this.tasks = this.tasks.filter((task) => task._id !== taskId);
          alert('Task deleted successfully.');
        },
        (error) => {
          console.error('Error deleting task:', error);
          alert('Failed to delete the task. Please try again.');
        }
      );
    }
  }

  onTaskEditClick(task: Task): void {
    if (!task._id || !task._listId) {
      console.error('Task ID or List ID is missing');
      return;
    }
    this.router.navigate([`/lists/${task._listId}/tasks/${task._id}/edit`]);
  }
}
