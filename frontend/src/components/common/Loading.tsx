interface LoadingProps {
  fullPage?: boolean;
}

export function Loading({ fullPage }: LoadingProps) {
  const spinner = (
    <div className="flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        {spinner}
      </div>
    );
  }

  return <div className="py-12">{spinner}</div>;
}
