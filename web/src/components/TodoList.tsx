import { Link } from "react-router-dom";
import { Todo } from "../lib/api";
import { formatDate } from "../lib/dates";

interface Props {
  todos: Todo[];
  showClient?: boolean;
  onUpload?: (todo: Todo) => void;
  onLogVisit?: (todo: Todo) => void;
  onResolve?: (todo: Todo) => void;
}

const TYPE_LABEL: Record<Todo["type"], string> = {
  MISSING_DOCUMENT: "Missing document",
  OVERDUE_DOCUMENT: "Overdue document",
  VISIT_OVERDUE: "Visit overdue",
  ONBOARDING_STEP: "Onboarding step",
  OCRS_MOVEMENT: "OCRS movement",
  INFRINGEMENT: "Infringement",
};

export function TodoList({ todos, showClient, onUpload, onLogVisit, onResolve }: Props) {
  if (todos.length === 0) {
    return <p className="empty-state">Nothing open — you're all caught up.</p>;
  }

  return (
    <ul className="todo-list">
      {todos.map((todo) => (
        <li key={todo.id} className="todo-item">
          <div className="todo-item-main">
            <span className={`todo-type todo-type-${todo.type.toLowerCase()}`}>
              {TYPE_LABEL[todo.type]}
            </span>
            <span className="todo-description">{todo.description}</span>
            {showClient && todo.client && (
              <Link to={`/clients/${todo.clientId}`} className="todo-client-link">
                {todo.client.companyName}
              </Link>
            )}
            <span className="todo-date">since {formatDate(todo.createdAt)}</span>
          </div>
          <div className="todo-item-actions">
            <button
              type="button"
              className="btn btn-secondary"
              disabled
              title="Chase drafts land in Phase 3 — no email integration yet"
            >
              Chase
            </button>
            {(todo.type === "MISSING_DOCUMENT" || todo.type === "OVERDUE_DOCUMENT") && onUpload && (
              <button type="button" className="btn btn-primary" onClick={() => onUpload(todo)}>
                Upload
              </button>
            )}
            {todo.type === "VISIT_OVERDUE" && onLogVisit && (
              <button type="button" className="btn btn-primary" onClick={() => onLogVisit(todo)}>
                Log visit
              </button>
            )}
            {todo.type !== "MISSING_DOCUMENT" &&
              todo.type !== "OVERDUE_DOCUMENT" &&
              todo.type !== "VISIT_OVERDUE" &&
              onResolve && (
                <button type="button" className="btn btn-primary" onClick={() => onResolve(todo)}>
                  Mark resolved
                </button>
              )}
          </div>
        </li>
      ))}
    </ul>
  );
}
