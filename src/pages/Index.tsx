import AppSidebar from '@/components/AppSidebar';
import PageEditor from '@/components/PageEditor';
import ResizableSidebarWrapper from '@/components/ResizableSidebarWrapper';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

const Index = () => {
  const { enabled: resizableSidebar } = useFeatureFlag('resizable-sidebar', true);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ResizableSidebarWrapper enabled={resizableSidebar}>
        <AppSidebar resizableSidebar={resizableSidebar} />
      </ResizableSidebarWrapper>
      <PageEditor />
    </div>
  );
};

export default Index;
