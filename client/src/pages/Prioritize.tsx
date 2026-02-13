/**
 * RLX Onboarding - Meeting Prioritization Page
 * Drag-and-drop ranking of all attendees
 */

import { useState, useEffect } from "react";

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
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AnimatedSection from "@/components/AnimatedSection";
import { Button } from "@/components/ui/button";
import { GripVertical, Download, Send, Building2, Briefcase, Users } from "lucide-react";
import { attendees, Attendee } from "@/lib/attendees";
import { toast } from "sonner";

interface SortableAttendeeProps {
  attendee: Attendee;
  rank: number;
}

function SortableAttendee({ attendee, rank }: SortableAttendeeProps) {
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
    <div
      ref={setNodeRef}
      style={style}
      className={`glass-card p-4 rounded-lg cursor-move hover:border-accent/50 transition-all relative ${
        isDragging ? "z-50 shadow-lg" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="absolute top-2 left-2">
        <GripVertical className="w-4 h-4 text-muted-foreground hover:text-accent transition-colors" />
      </div>
      
      <div className="absolute top-2 right-2">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-accent/30">
          <span className="text-sm font-heading font-bold text-accent">{rank}</span>
        </div>
      </div>

      <div className="pt-8 pb-2">
        <h3 className="text-base font-heading font-bold text-foreground mb-1 line-clamp-2 uppercase">
          {attendee.firstName} {attendee.lastName}
        </h3>
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{attendee.jobTitle}</p>
        
        <div className="space-y-1.5">
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Building2 className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span className="line-clamp-1">{attendee.company}</span>
          </div>
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Briefcase className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span className="line-clamp-1">{attendee.industry}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="w-3 h-3 flex-shrink-0" />
            <span>{attendee.companySize}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Prioritize() {
  const [rankedAttendees, setRankedAttendees] = useState<Attendee[]>([]);

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
      } catch {
        // Sort alphabetically by last name as default
        const sorted = [...attendees].sort((a, b) => 
          a.lastName.localeCompare(b.lastName)
        );
        setRankedAttendees(sorted);
      }
    } else {
      // Sort alphabetically by last name as default
      const sorted = [...attendees].sort((a, b) => 
        a.lastName.localeCompare(b.lastName)
      );
      setRankedAttendees(sorted);
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
        return arrayMove(items, oldIndex, newIndex);
      });
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

  function emailWithCSV() {
    // Save to localStorage first
    const ids = rankedAttendees.map((a) => a.id);
    localStorage.setItem("rlx-meeting-priorities", JSON.stringify(ids));

    // Create CSV content for attachment
    const csvHeader = "Rank,First Name,Last Name,Job Title,Company,Industry,Company Size\n";
    const csvRows = rankedAttendees
      .map((a, i) => 
        `${i + 1},"${a.firstName}","${a.lastName}","${a.jobTitle}","${a.company}","${a.industry}","${a.companySize}"`
      )
      .join('\n');
    
    const csvContent = csvHeader + csvRows;

    // Email template message
    const emailBody = `Hi CS,

Please see attached our top ranked priorities for the upcoming RLX event.

Best regards`;

    const subject = 'RLX Meeting Priorities - Top Ranked Attendees';

    // Note: mailto links cannot attach files directly due to security restrictions
    // We'll open the email with the message and prompt user to attach the downloaded CSV
    try {
      // First download the CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', 'rlx-meeting-priorities.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Then open email client with template
      const mailtoLink = `mailto:clientsuccess@recruitmentevents.co?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
      
      const emailLink = document.createElement('a');
      emailLink.href = mailtoLink;
      emailLink.click();
      
      toast.success("CSV downloaded and email opened!", {
        description: "Please attach the downloaded CSV file to your email before sending."
      });
    } catch (error) {
      toast.error("Could not complete action", {
        description: "Please use the Download CSV button and manually email to clientsuccess@recruitmentevents.co"
      });
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
            <p className="text-sm text-foreground/90 leading-relaxed text-center mb-3">
              <strong className="text-accent">Meetings are guaranteed but there's no guarantee we'll match your top 12/20.</strong>
            </p>
            <p className="text-sm text-foreground/90 leading-relaxed text-center">
              <strong className="text-accent">Instructions:</strong> Click and drag attendee cards to reorder them. 
              Your top priorities should be at the top-left. When finished, download the CSV and email it to clientsuccess@recruitmentevents.co
            </p>
          </div>
        </AnimatedSection>

        <div className="mb-12">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={rankedAttendees.map((a) => a.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {rankedAttendees.map((attendee, index) => (
                  <SortableAttendee
                    key={attendee.id}
                    attendee={attendee}
                    rank={index + 1}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <AnimatedSection delay={200}>
          <div className="flex justify-center gap-4 flex-wrap">
            <Button
              onClick={downloadCSV}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-heading gap-2 px-8"
            >
              <Download className="w-5 h-5" />
              Download CSV
            </Button>
            <Button
              onClick={emailWithCSV}
              size="lg"
              variant="outline"
              className="font-heading gap-2 px-8 border-accent/30 hover:border-accent hover:bg-accent/10"
            >
              <Send className="w-5 h-5" />
              Email to CS Team
            </Button>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Download the CSV file and attach it to your email to clientsuccess@recruitmentevents.co
          </p>
        </AnimatedSection>


      </div>
    </div>
  );
}
