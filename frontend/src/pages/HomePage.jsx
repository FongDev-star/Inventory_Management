import { useAuthStore } from "../store/useAuthStore";

export default function HomePage() {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">Hello, {user.name}</h1>
      <p>
        Role: <span className="badge badge-primary">{user.role}</span>
      </p>
      <button className="btn btn-outline" onClick={logout}>
        Log out
      </button>
    </div>
  );
}