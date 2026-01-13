export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">English Conversation Training</h1>
        <p className="text-muted-foreground text-lg">
          2ヶ月で英語が話せるようになるアプリ
        </p>
        <div className="mt-8">
          <button className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity">
            Start Training
          </button>
        </div>
      </div>
    </main>
  );
}
