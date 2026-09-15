export class NotFoundError extends Error {
  status = 404;
  constructor(resource: string, id: string) {
    super(`${resource} ${id} not found`);
  }
}
