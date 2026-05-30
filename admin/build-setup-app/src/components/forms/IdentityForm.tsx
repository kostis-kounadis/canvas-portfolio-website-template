import { useConfigStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function IdentityForm() {
  const { config, updateConfig } = useConfigStore();
  if (!config) return null;

  return (
    <div className="space-y-10 max-w-2xl">
      {/* Site Identity Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-medium tracking-[-0.02em] text-zinc-900 mb-1">Site Identity</h2>
          <p className="text-sm text-zinc-500 mb-4">Basic information about your portfolio.</p>
        </div>

        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="title">Site Title</Label>
            <Input 
              id="title" 
              value={config.site.title}
              onChange={(e) => updateConfig(c => { c.site.title = e.target.value })}
              placeholder="My Portfolio"
            />
            <p className="text-xs text-zinc-500">Shown in browser tab and as the title module on canvas.</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email Address</Label>
            <Input 
              id="email" 
              type="email"
              value={config.site.email}
              onChange={(e) => updateConfig(c => { c.site.email = e.target.value })}
              placeholder="hello@example.com"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="url">Site URL</Label>
            <Input 
              id="url" 
              type="url"
              value={config.site.url}
              onChange={(e) => updateConfig(c => { c.site.url = e.target.value })}
              placeholder="https://example.com"
            />
            <p className="text-xs text-zinc-500">Used for SEO canonical URL and Schema.org markup.</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="author">Author Name</Label>
            <Input 
              id="author" 
              value={config.site.author}
              onChange={(e) => updateConfig(c => { c.site.author = e.target.value })}
              placeholder="Your Name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="infoText">Info / About Text</Label>
            <textarea 
              id="infoText" 
              className="flex min-h-[120px] w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
              value={config.site.infoText}
              onChange={(e) => updateConfig(c => { c.site.infoText = e.target.value })}
              placeholder="Describe yourself and your work…"
            />
            <p className="text-xs text-zinc-500">Supports **bold**, _italic_, and [links](url). Shown in the Info overlay.</p>
          </div>
        </div>
      </div>

      {/* SEO & Metadata Section */}
      <div className="space-y-6 pt-6 border-t border-zinc-200">
        <div>
          <h2 className="text-lg font-medium tracking-[-0.02em] text-zinc-900 mb-1">SEO & Metadata</h2>
          <p className="text-sm text-zinc-500 mb-4">Search engine and social media sharing info.</p>
        </div>
        
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="metaDescription">Meta Description</Label>
            <textarea 
              id="metaDescription"
              className="flex min-h-[80px] w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
              value={config.seo.metaDescription}
              onChange={(e) => updateConfig(c => { c.seo.metaDescription = e.target.value })}
              placeholder="A brief description of your portfolio..."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="keywords">Keywords (comma separated)</Label>
            <Input 
              id="keywords"
              value={config.seo.keywords.join(', ')}
              onChange={(e) => updateConfig(c => { c.seo.keywords = e.target.value.split(',').map(s=>s.trim()) })}
              placeholder="portfolio, designer, creative..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
