import { useEffect } from "react"
import Layout from "./components/Layout"
import { useConfigStore } from "./lib/store"
import { Toaster } from "@/components/ui/sonner"
import { Skeleton } from "@/components/ui/skeleton"
import {
  IdentityForm,
  ThemeForm,
  LayoutsForm,
  ModulesForm,
  DeploymentForm,
  FaviconForm,
  HelpForm,
  ImageSettingsForm
} from "./components/Forms"

function App() {
  const { fetchConfig, isLoading, error, activeSection } = useConfigStore()

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'identity': return <IdentityForm />
      case 'theme': return <ThemeForm />
      case 'layouts': return <LayoutsForm />
      case 'images': return <ImageSettingsForm />
      case 'modules': return <ModulesForm />

      case 'favicon': return <FaviconForm />
      case 'deployment': return <DeploymentForm />
      case 'help': return <HelpForm />
      default: return <div>Select a section from the sidebar.</div>
    }
  }

  return (
    <>
      <Layout>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-[250px]" />
            <Skeleton className="h-4 w-[300px]" />
            <div className="space-y-2 mt-8">
              <Skeleton className="h-[400px] w-full" />
            </div>
          </div>
        ) : error ? (
          <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-md">
            <h2 className="font-semibold mb-2">Error Loading Configuration</h2>
            <p className="text-sm">{error}</p>
            <p className="text-sm mt-4">Make sure the Node.js server is running via <code className="bg-red-100 px-1 rounded">npm start</code></p>
          </div>
        ) : (
          renderActiveSection()
        )}
      </Layout>
      <Toaster position="bottom-right" />
    </>
  )
}

export default App
