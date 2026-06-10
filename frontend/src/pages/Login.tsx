import { LoginForm } from "../components/Auth/LoginForm";

export function Login() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary-600 text-2xl font-bold text-white">
            L
          </div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Own Lovi</h2>
          <p className="mt-1 text-sm text-gray-500">AI Support Agent Platform</p>
        </div>
        <div className="rounded-xl bg-white p-8 shadow-sm border">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
