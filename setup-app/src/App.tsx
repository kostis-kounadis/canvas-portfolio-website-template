import Layout from "./components/Layout"

function App() {
  return (
    <Layout>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Settings</h1>
        <p className="text-zinc-500">Configure your portfolio template settings here.</p>
        
        <div className="border border-zinc-200 rounded p-4 bg-white">
          <p className="text-sm">More configuration panels will go here.</p>
        </div>
      </div>
    </Layout>
  )
}

export default App
