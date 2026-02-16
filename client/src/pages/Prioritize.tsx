/**
 * RLX Onboarding - Meeting Prioritization Page
 * Table-based drag-and-drop ranking of all attendees
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

// Suppress benign ResizeObserver errors from drag-and-drop
if (typeof window !== 'undefined') {
  const resizeObserverErr = window.console.error;
  window.console.error = (...args: any[]) => {
    const errorMessage = typeof args[0] === 'string' ? args[0] : String(args[0]);
    if (errorMessage.includes('ResizeObserver loop')) return;
    resizeObserverErr(...args);
  };
  
  // Also suppress at the window level
  window.addEventListener('error', (e) => {
    if (e.message && e.message.includes('ResizeObserver loop')) {
      e.stopImmediatePropagation();
      return false;
    }
  });
}
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AnimatedSection from "@/components/AnimatedSection";
import NextButton from "@/components/NextButton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GripVertical, Download } from "lucide-react";
import { attendees, Attendee } from "@/lib/attendees";
import { toast } from "sonner";

interface SortableRowProps {
  attendee: Attendee;
  rank: number;
}

function SortableRow({ attendee, rank }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: attendee.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 200ms ease",
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-border/30 hover:bg-accent/5 cursor-move transition-colors ${
        isDragging ? "z-50 shadow-lg bg-accent/10" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      <td className="py-2 px-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground hover:text-accent transition-colors" />
          <span className="text-sm font-heading font-bold text-accent">{rank}</span>
        </div>
      </td>
      <td className="py-2 px-3 text-sm text-foreground font-medium uppercase">
        {attendee.firstName} {attendee.lastName}
      </td>
      <td className="py-2 px-3 text-sm text-muted-foreground">{attendee.jobTitle}</td>
      <td className="py-2 px-3 text-sm text-muted-foreground">{attendee.company}</td>
      <td className="py-2 px-3 text-sm text-muted-foreground">{attendee.industry}</td>
      <td className="py-2 px-3 text-sm text-muted-foreground text-center">{attendee.companySize}</td>
    </tr>
  );
}

export default function Prioritize() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const { data: profile } = trpc.sponsor.getProfile.useQuery();
  const { data: existingIntake } = trpc.intake.getSubmission.useQuery();
  const submitRankings = trpc.rankings.submit.useMutation();
  
  const [rankedAttendees, setRankedAttendees] = useState<Attendee[]>([]);
  const [customOrder, setCustomOrder] = useState<Attendee[]>([]);
  const [sortBy, setSortBy] = useState<string>("custom");
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Load saved rankings from localStorage or use default alphabetical order
    const saved = localStorage.getItem("rlx-meeting-priorities");
    if (saved) {
      try {
        const savedIds = JSON.parse(saved);
        const ordered = savedIds
          .map((id: string) => attendees.find((a) => a.id === id))
          .filter(Boolean);
        setRankedAttendees(ordered);
        setCustomOrder(ordered); // Save as custom order
      } catch {
        // Sort alphabetically by last name as default
        const sorted = [...attendees].sort((a, b) => 
          a.lastName.localeCompare(b.lastName)
        );
        setRankedAttendees(sorted);
        setCustomOrder(sorted);
      }
    } else {
      // Sort alphabetically by last name as default
      const sorted = [...attendees].sort((a, b) => 
        a.lastName.localeCompare(b.lastName)
      );
      setRankedAttendees(sorted);
      setCustomOrder(sorted);
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setRankedAttendees((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Save to localStorage
        const ids = newOrder.map((a) => a.id);
        localStorage.setItem("rlx-meeting-priorities", JSON.stringify(ids));
        
        // Update custom order
        setCustomOrder(newOrder);
        
        return newOrder;
      });
      
      // Reset to custom sort when manually dragging
      setSortBy("custom");
    }
  }

  function handleSort(value: string) {
    setSortBy(value);
    
    let sorted: Attendee[];
    switch (value) {
      case "custom":
        // Restore custom order
        sorted = customOrder;
        break;
      case "company":
        sorted = [...rankedAttendees].sort((a, b) => a.company.localeCompare(b.company));
        break;
      case "industry":
        sorted = [...rankedAttendees].sort((a, b) => a.industry.localeCompare(b.industry));
        break;
      case "orgsize":
        // Sort by company size (parse the numbers)
        sorted = [...rankedAttendees].sort((a, b) => {
          const parseSize = (size: string) => {
            const match = size.match(/[\d,]+/);
            if (!match) return 0;
            return parseInt(match[0].replace(/,/g, ''));
          };
          return parseSize(b.companySize) - parseSize(a.companySize);
        });
        break;
      default:
        return;
    }
    
    setRankedAttendees(sorted);
    
    // Only save to localStorage if it's custom order
    if (value === "custom") {
      const ids = sorted.map((a) => a.id);
      localStorage.setItem("rlx-meeting-priorities", JSON.stringify(ids));
    }
  }

  function downloadCSV() {
    // Save to localStorage first
    const ids = rankedAttendees.map((a) => a.id);
    localStorage.setItem("rlx-meeting-priorities", JSON.stringify(ids));

    // Create CSV content
    const csvHeader = "Rank,First Name,Last Name,Job Title,Company,Industry,Company Size\n";
    const csvRows = rankedAttendees
      .map((a, i) => 
        `${i + 1},"${a.firstName}","${a.lastName}","${a.jobTitle}","${a.company}","${a.industry}","${a.companySize}"`
      )
      .join('\n');
    
    const csvContent = csvHeader + csvRows;
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'rlx-meeting-priorities.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("CSV downloaded successfully!", {
      description: "Your meeting priorities have been saved to a CSV file."
    });
  }

  async function handleSubmit() {
    // Check if profile is set up
    if (!profile) {
      toast.error("Please set up your sponsor profile first");
      setLocation("/sponsor-profile");
      return;
    }

    // Download CSV first
    downloadCSV();
    
    // Submit to backend
    setIsSubmitting(true);
    try {
      const ids = rankedAttendees.map((a) => a.id);
      await submitRankings.mutateAsync({
        rankingsData: JSON.stringify(ids),
      });
      
      // Show success dialog
      setShowSubmitDialog(true);
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Failed to submit rankings. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen py-20">
      <div className="container max-w-7xl">
        <AnimatedSection>
          <div className="mb-12 text-center">
            <h1 className="text-foreground mb-6">Prioritise Your Meetings</h1>
            <div className="gold-divider max-w-md mx-auto mb-8"></div>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              Drag and drop to rank all {attendees.length} attendees in order of meeting priority. Your rankings will help us 
              schedule the most valuable meetings for your team.
            </p>
          </div>
        </AnimatedSection>

        {!existingIntake && (
          <AnimatedSection delay={50}>
            <div className="glass-card p-6 bg-yellow-900/30 border-yellow-600/50 rounded-lg mb-6">
              <h3 className="text-lg font-heading font-bold text-yellow-400 mb-2 text-center">⚠️ Intake Form Required</h3>
              <p className="text-sm text-yellow-200 leading-relaxed text-center mb-3">
                You haven't completed the intake form yet. Both the intake form and meeting rankings are required for your submission to be complete.
              </p>
              <div className="flex justify-center">
                <Button
                  onClick={() => setLocation("/intake")}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  Complete Intake Form First
                </Button>
              </div>
            </div>
          </AnimatedSection>
        )}

        <AnimatedSection delay={100}>
          <div className="glass-card p-6 bg-destructive/20 border-destructive/50 rounded-lg mb-6">
            <h3 className="text-lg font-heading font-bold text-white mb-3 text-center">⚠️ Strictly Confidential</h3>
            <p className="text-sm text-white leading-relaxed text-center mb-2">
              The information on this page is <strong>highly confidential</strong> and must not be shared with anyone outside your organisation, 
              including your own sales team. Sharing this information or reaching out to these delegates ahead of the event will be considered 
              a <strong>breach of trust</strong> and may result in <strong>removal from this event and exclusion from all future events</strong>.
            </p>
            <p className="text-xs text-white italic text-center">
              By proceeding, you acknowledge and agree to maintain strict confidentiality of all delegate information.
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={150}>
          <div className="glass-card p-6 bg-accent/10 border-accent/30 rounded-lg mb-8">
            <p className="text-sm text-white leading-relaxed text-center mb-3">
              <strong className="text-white">Meetings are guaranteed but there's no guarantee we'll match your top priorities.</strong>
            </p>
            <p className="text-sm text-foreground/90 leading-relaxed text-center">
              <strong className="text-accent">Instructions:</strong> Drag rows to reorder them, or use the sort dropdown below. 
              Your top priorities should be at the top. When finished, click Submit to download the CSV.
            </p>
          </div>
        </AnimatedSection>

        {/* Sort Controls */}
        <AnimatedSection delay={200}>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <label className="text-sm font-heading font-medium text-foreground">Sort by:</label>
              <Select value={sortBy} onValueChange={handleSort}>
                <SelectTrigger className="w-[200px] bg-background/50 border-accent/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Order</SelectItem>
                  <SelectItem value="company">Company Name</SelectItem>
                  <SelectItem value="industry">Industry</SelectItem>
                  <SelectItem value="orgsize">Organisation Size</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              {rankedAttendees.length} attendees
            </div>
          </div>
        </AnimatedSection>

        {/* Table */}
        <AnimatedSection delay={250}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="glass-card rounded-lg overflow-hidden mb-8">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-primary/10 border-b border-border/50">
                    <tr>
                      <th className="py-3 px-3 text-left text-xs font-heading font-bold text-foreground uppercase tracking-wider w-20">
                        Rank
                      </th>
                      <th className="py-3 px-3 text-left text-xs font-heading font-bold text-foreground uppercase tracking-wider">
                        Name
                      </th>
                      <th className="py-3 px-3 text-left text-xs font-heading font-bold text-foreground uppercase tracking-wider">
                        Job Title
                      </th>
                      <th className="py-3 px-3 text-left text-xs font-heading font-bold text-foreground uppercase tracking-wider">
                        Company
                      </th>
                      <th className="py-3 px-3 text-left text-xs font-heading font-bold text-foreground uppercase tracking-wider">
                        Industry
                      </th>
                      <th className="py-3 px-3 text-center text-xs font-heading font-bold text-foreground uppercase tracking-wider">
                        Org Size
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <SortableContext
                      items={rankedAttendees.map((a) => a.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {rankedAttendees.map((attendee, index) => (
                        <SortableRow
                          key={attendee.id}
                          attendee={attendee}
                          rank={index + 1}
                        />
                      ))}
                    </SortableContext>
                  </tbody>
                </table>
              </div>
            </div>
          </DndContext>
        </AnimatedSection>

        <AnimatedSection delay={300}>
          <div className="flex justify-center gap-4 flex-wrap mb-8">
            <Button
              onClick={downloadCSV}
              size="lg"
              variant="outline"
              className="font-heading gap-2 px-8 border-accent/30 hover:border-accent hover:bg-accent/10"
            >
              <Download className="w-5 h-5" />
              Download CSV
            </Button>
            <Button
              onClick={handleSubmit}
              size="lg"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-heading gap-2 px-8"
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={350}>
          <NextButton href="/faq" label="Next: FAQ" />
        </AnimatedSection>
      </div>

      {/* Submit Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="glass-card border-accent/30">
          <DialogHeader>
            <DialogTitle className="text-foreground font-heading text-2xl">Rankings Submitted Successfully!</DialogTitle>
            <DialogDescription className="text-foreground/90 text-base leading-relaxed pt-4">
              Your meeting priorities have been submitted to our team. The CS team has been notified and will review your rankings.
              <br /><br />
              A CSV copy has also been downloaded to your device for your records.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button
              onClick={() => setShowSubmitDialog(false)}
              className="bg-primary hover:bg-primary/90"
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
