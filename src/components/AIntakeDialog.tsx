import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, FileText, Loader2, Upload, X } from "lucide-react";
import { useAppStore } from "@/store";

export function AIntakeDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const addTask = useAppStore(state => state.addTask);
  const user = useAppStore(state => state.user);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the data:mime/type;base64, part
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async () => {
    if (!prompt.trim() && !file) {
      toast.error("Please provide a prompt or upload a syllabus document.");
      return;
    }

    setIsProcessing(true);
    try {
      let documentPayload = null;
      if (file) {
        let mimeType = file.type || 'application/pdf';
        // Basic fallback for common types if type is missing
        if (!file.type) {
          if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
          else if (file.name.endsWith('.txt')) mimeType = 'text/plain';
        }
        
        const base64Data = await getBase64(file);
        documentPayload = {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        };
      }

      const res = await fetch("/api/agents/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          document: documentPayload
        })
      });

      if (!res.ok) throw new Error("Failed to process with AI Intake Agent");
      
      const data = await res.json();
      
      if (data.tasks && data.tasks.length > 0) {
        let addedCount = 0;
        data.tasks.forEach((t: any) => {
          addTask({
            id: crypto.randomUUID(),
            userId: user?.uid || "unknown-user",
            title: t.title,
            description: t.description || "",
            deadline: t.deadline || new Date(Date.now() + 86400000).toISOString(),
            status: "pending",
            priorityScore: t.priorityScore || 50,
            subtasks: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          addedCount++;
        });
        
        toast.success(`AI Extracted ${addedCount} task(s) successfully!`, {
          icon: <Sparkles className="h-4 w-4 text-emerald-500" />
        });
        
        setIsOpen(false);
        setPrompt("");
        setFile(null);
      } else {
        toast.error("No tasks could be extracted. Try a different prompt or document.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to process the input.");
    } finally {
      setIsProcessing(true);
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 border border-emerald-500/30 bg-emerald-100 text-emerald-600 hover:bg-emerald-200 hover:text-emerald-300 font-mono text-xs gap-2 rounded-full px-4 cursor-pointer">
        <Sparkles className="h-3.5 w-3.5" />
        AI Intake (Frantic)
      </DialogTrigger>
      <DialogContent className="bg-white border border-slate-200 text-slate-900 sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-light text-emerald-600 flex items-center gap-2" style={{ fontFamily: "'Georgia', serif" }}>
            <Sparkles className="h-5 w-5" /> AI Magic Intake
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <p className="text-xs text-slate-500">
            Paste a frantic prompt (e.g. &quot;I have a 10-page paper due in 4 hours&quot;) or upload a syllabus. The AI will automatically extract deadlines and priority scores.
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="prompt" className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Frantic Prompt</Label>
            <Textarea 
              id="prompt" 
              value={prompt} 
              onChange={e => setPrompt(e.target.value)} 
              className="bg-slate-100 border-slate-200 text-slate-900 focus-visible:ring-emerald-500 min-h-[100px] placeholder-slate-700" 
              placeholder="e.g. Help! I have 3 math assignments due tomorrow at 5pm and a huge CS project due on Friday..."
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Upload Syllabus / Doc</Label>
            
            <div className="flex items-center gap-3">
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                onChange={handleFileChange}
                accept=".pdf,.txt,.docx,.md"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                className="bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
              >
                <Upload className="h-4 w-4 mr-2" /> Select File
              </Button>
              
              {file && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-100 px-3 py-1.5 rounded-md border border-emerald-500/20 max-w-[200px]">
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{file.name}</span>
                  <button onClick={() => setFile(null)} className="ml-auto hover:text-emerald-300">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsOpen(false)} className="text-slate-500 hover:bg-slate-200">Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isProcessing || (!prompt.trim() && !file)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white min-w-[100px]"
            >
              {isProcessing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
              ) : (
                "Extract Tasks"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
