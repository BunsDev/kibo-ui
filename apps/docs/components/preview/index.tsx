import {
  SandboxCodeEditor,
  SandboxConsole,
  SandboxFileExplorer,
  SandboxLayout,
  SandboxPreview,
  SandboxTabs,
  SandboxTabsContent,
  SandboxTabsList,
  SandboxTabsTrigger,
} from '@repo/sandbox';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@repo/shadcn-ui/components/ui/resizable';
import { AppWindowIcon, CodeIcon, TerminalIcon } from 'lucide-react';
import { content } from './content';
import { PreviewProvider } from './provider';
import { tsconfig } from './tsconfig';
import { utils } from './utils';

type PreviewProps = {
  name: string;
  code: string;
  dependencies?: Record<string, string>;
};

const dependencyRegex = /^(.+?)(?:@(.+))?$/;
const registryRegex = /@\/registry\/new-york\/ui\//g;
const kiboRegex = /@\/components\/ui\/(?!kibo-ui\/)([^'"\s]+)/g;

const parseDependencyVersion = (dependency: string) => {
  const [name, version] =
    (dependency as string).match(dependencyRegex)?.slice(1) ?? [];

  return { name, version: version ?? 'latest' };
};

const parseContent = (content: string) =>
  content.replace(registryRegex, '@/components/ui/');

const processDependencies = (
  deps: Record<string, string> | undefined,
  target: Record<string, string>
) => {
  if (!deps) {
    return;
  }

  for (const dep of Object.values(deps)) {
    const { name, version } = parseDependencyVersion(dep);
    target[name] = version;
  }
};

const parseShadcnComponents = async (str: string) => {
  const parsedString = parseContent(str);
  const matches = parsedString.match(kiboRegex);

  const files: Record<string, string> = {};
  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};

  if (matches) {
    const components = [
      ...new Set(matches.map((m) => m.replace('@/components/ui/', ''))),
    ];

    await Promise.all(
      components.map(async (component) => {
        try {
          const mod = (await import(`./shadcn/${component}.json`)) as {
            name: string;
            dependencies?: Record<string, string>;
            devDependencies?: Record<string, string>;
            files?: { content: string }[];
          };

          const componentContent = mod.files?.[0]?.content ?? '';
          files[`/components/ui/${mod.name}.tsx`] =
            parseContent(componentContent);

          await Promise.all([
            processDependencies(mod.dependencies, dependencies),
            processDependencies(mod.devDependencies, devDependencies),
            parseShadcnComponents(componentContent),
          ]);
        } catch (error) {
          console.warn(`Failed to load shadcn component: ${component}`);
        }
      })
    );
  }

  return { files, dependencies, devDependencies };
};

export const Preview = async ({
  name,
  code,
  dependencies: demoDependencies,
}: PreviewProps) => {
  const [registry, initialParsedComponents] = await Promise.all([
    import(`../../public/registry/${name}.json`) as Promise<{
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      registryDependencies?: Record<string, string>;
      files?: { content: string }[];
    }>,
    parseShadcnComponents(code),
  ]);

  const { files, dependencies, devDependencies } = initialParsedComponents;

  // Set up initial files
  files['/App.tsx'] = code;
  files['/tsconfig.json'] = tsconfig;
  files['/lib/utils.ts'] = utils;
  files['/lib/content.ts'] = content;

  const selectedComponentContent = parseContent(
    registry.files?.[0]?.content ?? ''
  );

  await Promise.all([
    parseShadcnComponents(selectedComponentContent),
    registry.registryDependencies &&
      Promise.all(
        Object.values(registry.registryDependencies).map(async (dependency) => {
          const mod = (await import(`./shadcn/${dependency}.json`)) as {
            name: string;
            dependencies?: Record<string, string>;
            devDependencies?: Record<string, string>;
            files?: { content: string }[];
          };

          const componentContent = mod.files?.[0]?.content ?? '';
          files[`/components/ui/${mod.name}.tsx`] =
            parseContent(componentContent);

          processDependencies(mod.dependencies, dependencies);
          processDependencies(mod.devDependencies, devDependencies);

          return parseShadcnComponents(componentContent);
        })
      ),
  ]);

  files[`/components/ui/kibo-ui/${name}.tsx`] = parseContent(
    selectedComponentContent
  );

  // Process all dependencies
  processDependencies(registry.dependencies, dependencies);
  processDependencies(registry.devDependencies, devDependencies);
  processDependencies(demoDependencies, dependencies);

  return (
    <PreviewProvider
      template="react-ts"
      // options={{ bundlerURL: 'https://sandpack-bundler.codesandbox.io' }}
      options={{
        externalResources: [
          'https://cdn.tailwindcss.com',
          'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
        ],
      }}
      customSetup={{
        dependencies: {
          // shadcn/ui global dependencies
          '@radix-ui/react-icons': 'latest',
          clsx: 'latest',
          'tailwind-merge': 'latest',
          'class-variance-authority': 'latest',

          // Tailwind dependencies
          tailwindcss: 'latest',
          'tailwindcss-animate': 'latest',
          ...dependencies,

          // Common utilities
          'date-fns': 'latest',
        },
        devDependencies: {
          autoprefixer: 'latest',
          postcss: 'latest',
          ...devDependencies,
        },
      }}
      files={files}
      className="not-prose max-h-[30rem]"
    >
      <SandboxLayout>
        <SandboxTabs defaultValue="preview">
          <SandboxTabsList>
            <SandboxTabsTrigger value="code">
              <CodeIcon size={14} />
              Code
            </SandboxTabsTrigger>
            <SandboxTabsTrigger value="preview">
              <AppWindowIcon size={14} />
              Preview
            </SandboxTabsTrigger>
            <SandboxTabsTrigger value="console">
              <TerminalIcon size={14} />
              Console
            </SandboxTabsTrigger>
          </SandboxTabsList>
          <SandboxTabsContent value="code" className="overflow-hidden">
            <ResizablePanelGroup
              direction="horizontal"
              className="overflow-hidden"
            >
              <ResizablePanel
                className="!overflow-y-auto"
                defaultSize={25}
                minSize={20}
                maxSize={40}
              >
                <SandboxFileExplorer />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel className="!overflow-y-auto">
                <SandboxCodeEditor />
              </ResizablePanel>
            </ResizablePanelGroup>
          </SandboxTabsContent>
          <SandboxTabsContent value="preview">
            <SandboxPreview />
          </SandboxTabsContent>
          <SandboxTabsContent value="console">
            <SandboxConsole />
          </SandboxTabsContent>
        </SandboxTabs>
      </SandboxLayout>
    </PreviewProvider>
  );
};
