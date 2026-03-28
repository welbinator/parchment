import AppSidebar from '@/components/AppSidebar';
import PageEditor from '@/components/PageEditor';
import ResizableSidebarWrapper from '@/components/ResizableSidebarWrapper';

const Index = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ResizableSidebarWrapper enabled={true}>
        <AppSidebar resizableSidebar={true} />
      </ResizableSidebarWrapper>
      <PageEditor />
    </div>
  );
};

export default Index;
