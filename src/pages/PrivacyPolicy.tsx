import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto py-24 px-6 sm:px-12">
        <Button variant="ghost" asChild className="mb-8 -ml-4 text-slate-500">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
        
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-slate max-w-none">
          <p className="text-slate-500 font-medium mb-8">Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">1. Introduction</h2>
          <p className="text-slate-600 mb-6 leading-relaxed">
            Welcome to NEXUS ("we", "our", or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy outlines how we collect, use, and protect your information when you use our application for the Vibe2Ship Hackathon.
          </p>
          
          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">2. Information We Collect</h2>
          <p className="text-slate-600 mb-6 leading-relaxed">
            We collect personal information that you voluntarily provide to us when you register on the application. The personal information that we collect depends on the context of your interactions with us and the application, the choices you make, and the products and features you use. This may include:
          </p>
          <ul className="list-disc pl-6 text-slate-600 mb-6 space-y-2">
            <li><strong>Google Account Information:</strong> When you sign in with Google, we access basic profile information (such as your name and email address) to authenticate you and personalize your experience.</li>
            <li><strong>Task and Productivity Data:</strong> The application locally stores your tasks, priorities, and schedules to help you manage your time effectively.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">3. How We Use Your Information</h2>
          <p className="text-slate-600 mb-6 leading-relaxed">
            We use personal information collected via our application for a variety of business purposes described below:
          </p>
          <ul className="list-disc pl-6 text-slate-600 mb-6 space-y-2">
            <li>To facilitate account creation and logon process.</li>
            <li>To deliver and facilitate delivery of services to the user.</li>
            <li>To improve user productivity through AI-driven prioritization and planning.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">4. Third-Party Services</h2>
          <p className="text-slate-600 mb-6 leading-relaxed">
            We utilize Google services (such as Firebase Authentication and Gemini API) to power our application. These third-party services have their own privacy policies addressing how they use your information. We encourage you to review Google's privacy policy to understand their data processing practices.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">5. Contact Us</h2>
          <p className="text-slate-600 mb-6 leading-relaxed">
            If you have questions or comments about this policy, please reach out to the project developers associated with the Vibe2Ship Hackathon submission.
          </p>
        </div>
      </div>
    </div>
  );
}
