import { ArrowRight, Database, Droplets, Leaf, Mountain, Satellite, Sun, ThermometerSun, Trees } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FieldPattern, FarmoMark, SeedlingIllustration } from '@/components/brand/brand'
import { Stamp } from '@/components/ui/data'
import { HandRule, Panel, PanelBody, SectionHead } from '@/components/ui/surfaces'

export function LandingRoute() {
  return (
    <div className="min-h-dvh bg-paper flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 px-5 py-3 backdrop-blur-sm sm:px-8">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between">
          
          {/* Custom Logo for Landing Page */}
          <Link to="/" className="inline-flex items-center gap-2.5">
            <FarmoMark size={28} />
            <span className="flex flex-col leading-none">
              <span className="font-display font-semibold tracking-[-0.02em] text-ink" style={{ fontSize: 28 * 0.78 }}>
                FarmO
              </span>
              <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-ink-3">
                Farm decision support
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-ink-2 hover:text-ink">
              Sign in
            </Link>
            <Link to="/signup" className="btn btn-primary">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-line bg-paper-sunken px-5 py-16 sm:px-8 sm:py-24">
          <FieldPattern opacity={0.4} />
          <div className="relative mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="max-w-[56ch]">
              <p className="eyebrow mb-4">NASA Space Apps Challenge 2026</p>
              <h1 className="font-display text-4xl leading-[1.1] text-ink sm:text-5xl">
                Field Shift: Adapting farms with NASA data.
              </h1>
              <p className="mt-5 text-base leading-relaxed text-ink-2">
                Farmo is a decision-support tool that translates complex NASA satellite retrievals into plain-language
                advice for farmers. We bridge the gap between orbital data and the soil under your boots.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/login" className="btn btn-primary btn-lg gap-2">
                  Enter the demo <ArrowRight size={16} aria-hidden />
                </Link>
                <Link to="/signup" className="btn btn-outline btn-lg">
                  Create an account
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-2 text-xs text-ink-3">
                <Stamp tone="plain" className="border-line-strong">
                  <Leaf size={10} className="mr-1"/> 8 crops modelled
                </Stamp>
                <Stamp tone="plain" className="border-line-strong">
                  <Database size={10} className="mr-1"/> 7+ NASA datasets integrated
                </Stamp>
              </div>
            </div>
            
            {/* Right side illustration / panel */}
            <div className="hidden lg:block">
              <Panel className="rotate-1 border-line-strong shadow-[var(--shadow-pop)]">
                <PanelBody className="flex flex-col items-center justify-center p-10">
                  <div className="text-soil-300">
                    <SeedlingIllustration className="w-[180px]" />
                  </div>
                  <HandRule className="my-6 w-full" />
                  <p className="text-center font-display text-lg text-ink">
                    "The soil test said the field was fine. The water table said otherwise."
                  </p>
                  <p className="mt-2 text-center text-xs text-ink-3">— Field note, Cedar Valley</p>
                </PanelBody>
              </Panel>
            </div>
          </div>
        </section>

        {/* The Data Section */}
        <section className="border-b border-line px-5 py-16 sm:px-8 sm:py-24 bg-paper">
          <div className="mx-auto max-w-[1240px]">
            <SectionHead
              eyebrow="Open Data Integration"
              title="Grounded in NASA Earth Observation"
              description="We don't guess. The Farmo rule engine is seeded by real satellite telemetry. We integrate a suite of NASA and open-access datasets to model water stress, crop health, terrain, and climate risk."
            />

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {/* SMAP Card */}
              <Panel accent="green">
                <PanelBody className="flex h-full flex-col p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-sm border border-green-700/20">
                      SMAP
                    </span>
                    <Satellite size={16} className="text-green-600" />
                  </div>
                  <h3 className="font-display text-xl text-ink">Soil Moisture</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-2">
                    Surface and root-zone soil moisture retrievals seed the drought score and the irrigation window, giving us a real-time view of water stress.
                  </p>
                </PanelBody>
              </Panel>

              {/* Landsat & MODIS Card */}
              <Panel>
                <PanelBody className="flex h-full flex-col p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-ink-2 bg-paper-sunken px-2 py-1 rounded-sm border border-line-strong">
                      Landsat / MODIS
                    </span>
                    <Trees size={16} className="text-ink-3" />
                  </div>
                  <h3 className="font-display text-xl text-ink">Reflectance & Vegetation</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-2">
                    NDVI and vegetation indices allow us to map crop vigor, track seasonal transitions, and flag high-stress periods before yield is lost.
                  </p>
                </PanelBody>
              </Panel>

              {/* NASA POWER Card */}
              <Panel>
                <PanelBody className="flex h-full flex-col p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-ink-2 bg-paper-sunken px-2 py-1 rounded-sm border border-line-strong">
                      NASA POWER
                    </span>
                    <Sun size={16} className="text-ink-3" />
                  </div>
                  <h3 className="font-display text-xl text-ink">Agroclimatology</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-2">
                    Solar, meteorological, and climatology data (temperature, humidity, radiation) help estimate crop water use, growing-season conditions, and frost risk.
                  </p>
                </PanelBody>
              </Panel>

              {/* SRTM Card */}
              <Panel>
                <PanelBody className="flex h-full flex-col p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-ink-2 bg-paper-sunken px-2 py-1 rounded-sm border border-line-strong">
                      SRTM
                    </span>
                    <Mountain size={16} className="text-ink-3" />
                  </div>
                  <h3 className="font-display text-xl text-ink">Elevation & Terrain</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-2">
                    Global elevation data analyzes slope, runoff, and water flow. Terrain patterns help determine which rotation crops improve infiltration and reduce erosion.
                  </p>
                </PanelBody>
              </Panel>

              {/* ECOSTRESS Card */}
              <Panel>
                <PanelBody className="flex h-full flex-col p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-ink-2 bg-paper-sunken px-2 py-1 rounded-sm border border-line-strong">
                      ECOSTRESS
                    </span>
                    <ThermometerSun size={16} className="text-ink-3" />
                  </div>
                  <h3 className="font-display text-xl text-ink">Evapotranspiration</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-2">
                    High-resolution land-surface temperature and ET data helps detect hotspots of plant stress, heat exposure, and shallow-root vulnerability.
                  </p>
                </PanelBody>
              </Panel>

              {/* IMERG Card */}
              <Panel>
                <PanelBody className="flex h-full flex-col p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-ink-2 bg-paper-sunken px-2 py-1 rounded-sm border border-line-strong">
                      IMERG
                    </span>
                    <Droplets size={16} className="text-ink-3" />
                  </div>
                  <h3 className="font-display text-xl text-ink">Precipitation</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-2">
                    High-resolution global rainfall estimates refine irrigation scheduling, trigger early flood warnings, and verify local rain gauge data.
                  </p>
                </PanelBody>
              </Panel>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="px-5 py-16 sm:px-8 sm:py-24 bg-paper-sunken">
          <div className="mx-auto max-w-[1240px]">
             <SectionHead
              eyebrow="The Engine"
              title="Advice with the numbers behind it"
              description="Farmo doesn't use black boxes. We use deterministic rules over your actual soil tests, crop stages, and satellite data to generate advice you can defend."
            />
            
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              <div className="flex flex-col gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-paper-raised font-display text-sm">1</span>
                <h4 className="font-display text-lg text-ink">Ingest Property Record</h4>
                <p className="text-sm leading-relaxed text-ink-2">
                  Input your soil test (pH, N, P, K, organic matter), planting dates, and irrigation type. This forms the baseline reality of your farm.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-paper-raised font-display text-sm">2</span>
                <h4 className="font-display text-lg text-ink">Cross-reference Data</h4>
                <p className="text-sm leading-relaxed text-ink-2">
                  The engine layers NASA satellite telemetry (moisture, temp, vegetation) and 14-day weather forecasts over your baseline to model live conditions.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-paper-raised font-display text-sm">3</span>
                <h4 className="font-display text-lg text-ink">Generate Ledger</h4>
                <p className="text-sm leading-relaxed text-ink-2">
                  Receive a plain-language agronomist's ledger: exact fertilizer splits, irrigation windows, and risk scores, all with a clear "why".
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-line bg-paper px-5 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-[1240px]">
            <SectionHead
              eyebrow="Watch"
              title="See Farmo in action"
              description="Watch how Farmo turns field records into practical farming decisions."
            />
            <video
              className="mt-10 aspect-video w-full rounded-sm border border-line bg-ink"
              controls
              playsInline
              preload="none"
              poster="/farmo-explainer-poster.jpg"
              aria-label="Farmo explainer video with music"
            >
              <source src="/farmo-explainer.mp4" type="video/mp4" />
              Your browser does not support embedded video. <a href="/farmo-explainer.mp4">Download the Farmo explainer</a>.
            </video>
          </div>
        </section>

        {/* CTA Footer */}
        <section className="border-t border-line bg-paper px-5 py-16 text-center sm:px-8">
          <h2 className="font-display text-3xl text-ink">Ready to see your farm's ledger?</h2>
          <p className="mt-3 text-sm text-ink-2">Sign in to the demo environment to explore the seeded farms.</p>
          <div className="mt-6 flex justify-center">
            <Link to="/login" className="btn btn-primary btn-lg gap-2">
              Enter the demo <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-paper-sunken px-5 py-6 text-xs text-ink-3 sm:px-8">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4">
          <span>Built for the 2026 NASA Space Apps Challenge.</span>
          <span>Advice is decision support, not a guarantee of yield.</span>
        </div>
      </footer>
    </div>
  )
}