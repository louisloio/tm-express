import { Link } from "react-router-dom";
import { TodoItem, todoTypeLabel } from "../lib/todos";

interface Props {
  todos: TodoItem[];
  showClient?: boolean;
  clientNameById?: Record<string, string>;
}

export function TodoList({ todos, showClient, clientNameById }: Props) {
  if (todos.length === 0) {
    return <p className="empty-state">Nothing open — you're all caught up.</p>;
  }

  return (
    <ul className="todo-list">
      {todos.map((todo) => (
        <li key={todo.id} className="todo-item">
          <div className="todo-item-main">
            <span className={`todo-type todo-type-${todo.type.toLowerCase()}`}>
              {todoTypeLabel[todo.type]}
            </span>
            <span className="todo-description">{todo.description}</span>
            {showClient && clientNameById && (
              <Link to={`/clients/${todo.clientId}`} className="todo-client-link">
                {clientNameById[todo.clientId] ?? "Client"}
              </Link>
            )}
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
          </div>
        </li>
      ))}
    </ul>
  );
}
