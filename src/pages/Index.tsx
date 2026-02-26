import AppSidebar from '@/components/AppSidebar';
import PageEditor from '@/components/PageEditor';

const Index = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <PageEditor />
    </div>
  );
};

export default Index;
