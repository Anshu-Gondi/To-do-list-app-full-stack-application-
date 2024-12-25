import { Injectable } from '@angular/core';
import { WebRequestService } from './web-request.service';
import { catchError } from 'rxjs/operators';
import { Observable, of, throwError } from 'rxjs';
import { Task } from './models/task.model';
import { List } from './models/list.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  constructor(
    private webRequestService: WebRequestService,
    private authService: AuthService
  ) {}

  getLists(): Observable<any> {
    const token = this.authService.getAccessToken(); // Get the access token from auth service
    if (!token) {
      throw new Error('Access token is missing');
    }

    // Passing headers directly to webRequestService
    return this.webRequestService.get('lists', {
      Authorization: `Bearer ${token}`,
    });
  }

  getTasks(listId: string): Observable<Task[]> {
    const token = this.authService.getAccessToken(); // Get the access token from auth service
    if (!token) {
      throw new Error('Access token is missing');
    }

    // Passing headers directly to webRequestService
    return this.webRequestService
      .get<Task[]>(`lists/${listId}/tasks`, {
        Authorization: `Bearer ${token}`,
      })
      .pipe(
        catchError((error) => {
          if (error.status === 404) {
            console.warn('No tasks found for list:', listId);
            return of([] as Task[]);
          }
          return throwError(() => error);
        })
      );
  }

  createList(title: string): Observable<List> {
    const token = this.authService.getAccessToken(); // Get the access token from auth service
    if (!token) {
      throw new Error('Access token is missing');
    }

    // Pass headers to the request
    return this.webRequestService.post<List>(
      'lists',
      { title },
      {
        Authorization: `Bearer ${token}`,
      }
    );
  }

  createTasks(title: string, listId: string): Observable<Task> {
    const token = this.authService.getAccessToken(); // Get the access token from auth service
    if (!token) {
      throw new Error('Access token is missing');
    }

    // Pass headers to the request
    return this.webRequestService.post<Task>(
      `lists/${listId}/tasks`,
      { title },
      {
        Authorization: `Bearer ${token}`,
      }
    );
  }

  complete(task: Task): Observable<void> {
    const token = this.authService.getAccessToken(); // Get the access token from auth service
    if (!token) {
      throw new Error('Access token is missing');
    }

    // Pass headers to the request
    return this.webRequestService.patch<void>(
      `lists/${task._listId}/tasks/${task._id}`,
      { completed: !task.completed },
      {
        Authorization: `Bearer ${token}`,
      }
    );
  }
}