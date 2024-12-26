import { Component } from '@angular/core';
import { TaskService } from '../../task.service';
import { Router, ActivatedRoute, Params, RouterLink } from '@angular/router';
import { List } from '../../models/list.model';

@Component({
  selector: 'app-edit-list',
  templateUrl: './edit-list.component.html',
  styleUrls: ['./edit-list.component.scss'],
  imports: [RouterLink]
})
export class EditListComponent {
  listId!: string; // Use definite assignment assertion
  originalTitle: string = ''; // Display the current list title

  constructor(
    private taskService: TaskService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Fetch the listId from route params
    this.route.params.subscribe((params: Params) => {
      this.listId = params['listId'];
      // Fetch the list title for the given listId
      this.taskService.getLists().subscribe((lists: List[]) => {
        const list = lists.find((l) => l._id === this.listId);
        this.originalTitle = list?.title || '';
      });
    });
  }

  updateList(title: string): void {
    if (!title.trim()) {
      alert('List title cannot be empty.');
      return;
    }

    this.taskService.updateList(this.listId, title).subscribe({
      next: (response: List) => {
        console.log('List updated successfully:', response);
        alert('List updated successfully.');
        this.router.navigate(['/lists', response._id]);
      },
      error: (error: any) => {
        console.error('Error updating list:', error);
        alert('Failed to update list. Check console for details.');
      },
    });
  }
}
