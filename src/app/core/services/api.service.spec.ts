import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService, AuthService],
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getTasks', () => {
    it('should fetch tasks from API', async () => {
      const mockTasks = [
        {
          id: '1',
          userId: 'user-1',
          title: 'Test Task',
          description: 'Test Description',
          done: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const promise = service.getTasks();

      const req = httpMock.expectOne((request) => request.url.includes('/tasks'));
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: mockTasks });

      const result = await promise;
      expect(result).toEqual(mockTasks);
    });

    it('should handle API errors', async () => {
      const promise = service.getTasks();

      const req = httpMock.expectOne((request) => request.url.includes('/tasks'));
      req.error(new ErrorEvent('error'));

      await expectAsync(promise).toBeRejected();
    });
  });

  describe('createTask', () => {
    it('should create task on API', async () => {
      const newTask = {
        id: '1',
        userId: 'user-1',
        title: 'New Task',
        description: 'New Description',
        done: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const promise = service.createTask(newTask);

      const req = httpMock.expectOne((request) => request.url.includes('/tasks'));
      expect(req.request.method).toBe('POST');
      req.flush({ success: true, data: newTask });

      const result = await promise;
      expect(result).toEqual(newTask);
    });
  });

  describe('deleteTask', () => {
    it('should delete task on API', async () => {
      const promise = service.deleteTask('1');

      const req = httpMock.expectOne((request) => request.url.includes('/tasks/1'));
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });

      await expectAsync(promise).toBeResolved();
    });
  });

  describe('getSyncQueue', () => {
    it('should return empty queue initially', async () => {
      const queue = await service.getSyncQueue();
      expect(queue).toEqual([]);
    });
  });
});
