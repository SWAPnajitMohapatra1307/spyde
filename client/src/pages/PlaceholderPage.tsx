import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Construction } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  description = 'This feature is being built and will be available soon.',
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <Card level={1} className="max-w-sm w-full text-center p-8">
        <Construction className="w-10 h-10 text-spyde-amber mx-auto mb-4" />
        <h2 className="text-heading-md font-light text-spyde-bone mb-2">{title}</h2>
        <p className="text-caption text-spyde-sand mb-6">{description}</p>
        <Button variant="secondary" onClick={(): void => navigate('/home')}>
          Return to Home
        </Button>
      </Card>
    </div>
  );
};