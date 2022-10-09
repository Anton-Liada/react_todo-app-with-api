import React, {
  FormEvent, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { NewTodo } from './components/NewTodo/NewTodo';
import { AuthContext } from './components/Auth/AuthContext';
import { TodosFilter } from './components/TodosFilter/TodosFilter';
import { TodosList } from './components/TodosList/TodosList';
import { FilterStatus } from './types/FilterStatus';
import { Todo } from './types/Todo';
import { ErrorMessage } from './types/ErrorMessage';
import { ErrorNotification } from './components/ErrorNotification';
import {
  createTodo, deleteTodo, getTodos, updateTodo,
} from './api/todos';

export const App: React.FC = () => {
  const user = useContext(AuthContext);
  const newTodoField = useRef<HTMLInputElement>(null);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [filterType, setFilterType] = useState(FilterStatus.All);
  const [errorMessage, setErrorMessage] = useState<ErrorMessage | null>(null);
  const [isError, setIsError] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [selectedTodos, setSelectedTodos] = useState<number[]>([]);
  const [toggle, setToggle] = useState(true);

  const filteredTodos = useMemo(() => {
    return todos.filter(todo => {
      switch (filterType) {
        case FilterStatus.All:
          return todo;

        case FilterStatus.Active:
          return !todo.completed;

        case FilterStatus.Completed:
          return todo.completed;

        default:
          return null;
      }
    });
  }, [filterType, todos]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!title.trim()) {
      setIsError(true);
      setErrorMessage(ErrorMessage.TITLE);

      return;
    }

    setIsAdding(true);

    try {
      const newTodo = await createTodo(user?.id || 0, title);

      setTodos([...todos, newTodo]);
    } catch {
      setIsError(true);
      setErrorMessage(ErrorMessage.ADDING);
    } finally {
      setTitle('');
      setIsAdding(false);
    }
  };

  useEffect(() => {
    newTodoField.current?.focus();

    const fetchData = async () => {
      const todosFromServer = await getTodos(user?.id || 0);

      setTodos(todosFromServer);
    };

    try {
      fetchData();
    } catch {
      setErrorMessage(ErrorMessage.LOADING);
    }
  }, []);

  useEffect(() => {
    newTodoField.current?.focus();
  }, [todos]);

  const loadTodos = async () => {
    try {
      setTodos(await getTodos(user?.id || 0));
    } catch {
      setIsError(true);
      setErrorMessage(ErrorMessage.LOADING);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      setIsError(false);
    }, 3000);

    loadTodos();
  }, [isError, selectedTodos]);

  const handleRemove = async (todoId: number) => {
    setSelectedTodos([...selectedTodos, todoId]);

    try {
      await deleteTodo(todoId);

      setTodos(todos.filter(({ id }) => id !== todoId));
    } catch {
      setIsError(true);
      setErrorMessage(ErrorMessage.DELETING);
    } finally {
      setSelectedTodos([]);
    }
  };

  const completedTodos = useMemo(() => {
    return todos.filter(todo => todo.completed);
  }, [todos]);

  const deleteComplitedTodos = useCallback(() => {
    setSelectedTodos(completedTodos.map(todo => todo.id));

    try {
      Promise.all(completedTodos.map(todo => deleteTodo(todo.id)));
      setSelectedTodos([]);
    } catch {
      setIsError(true);
      setErrorMessage(ErrorMessage.DELETING);
    }
  }, [completedTodos]);

  const handleTodoUpdate = async (todoId: number, data: Partial<Todo>) => {
    setSelectedTodos([...selectedTodos, todoId]);

    try {
      const newTodo = await updateTodo(todoId, data);

      setTodos(todos.map(todo => (
        todo.id === todoId
          ? newTodo
          : todo
      )));
    } catch {
      setIsError(true);
      setErrorMessage(ErrorMessage.UPDATING);
    }

    setSelectedTodos([]);
  };

  const handleToggle = async () => {
    setSelectedTodos(toggle
      ? todos.filter(todo => !todo.completed).map(todo => todo.id)
      : completedTodos.map(todo => todo.id));

    try {
      const newTodos = await Promise.all(todos.map(todo => (
        todo.completed !== toggle
          ? updateTodo(todo.id, { completed: toggle })
          : todo
      )));

      setTodos(newTodos);
    } catch {
      setIsError(true);
      setErrorMessage(ErrorMessage.UPDATING);
    }

    setToggle(!toggle);
    setSelectedTodos([]);
  };

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <NewTodo
          todos={todos}
          newTodoField={newTodoField}
          title={title}
          setTitle={setTitle}
          handleSubmit={handleSubmit}
          isAdding={isAdding}
          handleToggle={handleToggle}
        />

        <TodosList
          todos={filteredTodos}
          isAdding={isAdding}
          title={title}
          removeTodo={handleRemove}
          setSelectedTodos={setSelectedTodos}
          selectedTodos={selectedTodos}
          onUpdate={handleTodoUpdate}
        />

        <TodosFilter
          todos={todos}
          setFilterType={setFilterType}
          filterType={filterType}
          onRemove={deleteComplitedTodos}
        />
      </div>

      <ErrorNotification
        errorMessage={errorMessage}
        isError={isError}
        setIsError={setIsError}
      />
    </div>
  );
};
