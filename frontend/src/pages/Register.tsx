import { RegisterForm } from "../components/Auth/RegisterForm";

export function Register() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary-600 text-2xl font-bold text-white">
            L
          </div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Create Account</h2>
          <p className="mt-1 text-sm text-gray-500">Start building your AI support agents</p>
        </div>
        <div className="rounded-xl bg-white p-8 shadow-sm border">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
