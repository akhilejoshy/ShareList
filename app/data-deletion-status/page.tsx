export default async function DataDeletionStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">Data deletion status</h1>
      <p className="mt-2 text-sm text-gray-600">
        Request code: {code ?? "unknown"}
      </p>
      <p className="mt-2 text-sm text-gray-600">
        Your data deletion request has been received and processed.
      </p>
    </main>
  );
}
