/**
 * RLX Onboarding - Meeting Prioritization Page
 * Drag-and-drop ranking of all attendees
 */

import { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { GripVertical, Send, Building2, Briefcase, Users } from "lucide-react";
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
      className={`glass-card p-4 rounded-lg flex items-center gap-4 cursor-move hover:border-accent/50 transition-all ${
        isDragging ? "z-50 shadow-lg" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-3">
        <GripVertical className="w-5 h-5 text-muted-foreground hover:text-accent transition-colors" />
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-accent/30 flex-shrink-0">
          <span className="text-lg font-heading font-bold text-accent">{rank}</span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-heading font-bold text-foreground truncate">
          {attendee.firstName} {attendee.lastName}
        </h3>
        <p className="text-sm text-muted-foreground truncate">{attendee.jobTitle}</p>
        <div className="flex flex-wrap gap-3 mt-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="w-3.5 h-3.5" />
            <span>{attendee.company}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Briefcase className="w-3.5 h-3.5" />
            <span>{attendee.industry}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span title="Organization Size">{attendee.companySize} employees</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Prioritize() {
  const [rankedAttendees, setRankedAttendees] = useState<Attendee[]>([]);

  useEffect(() => {
    // Load saved rankings from localStorage or use default order
    const saved = localStorage.getItem("rlx-meeting-priorities");
    if (saved) {
      try {
        const savedIds = JSON.parse(saved);
        const ordered = savedIds
          .map((id: string) => attendees.find((a) => a.id === id))
          .filter(Boolean);
        setRankedAttendees(ordered);
      } catch {
        setRankedAttendees([...attendees]);
      }
    } else {
      setRankedAttendees([...attendees]);
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

  function submitRankings() {
    // Save to localStorage first
    const ids = rankedAttendees.map((a) => a.id);
    localStorage.setItem("rlx-meeting-priorities", JSON.stringify(ids));

    // Create email body with rankings
    const emailBody = rankedAttendees
      .map((a, i) => 
        `${i + 1}. ${a.firstName} ${a.lastName} - ${a.jobTitle} at ${a.company} (${a.companySize} employees)`
      )
      .join('\n');

    const subject = encodeURIComponent('RLX Meeting Priorities Submission');
    const body = encodeURIComponent(
      `Please find my meeting priorities for the Resourcing Leaders Exchange:\n\n${emailBody}\n\nBest regards`
    );

    // Open mailto link
    window.location.href = `mailto:clientsuccess@recruitmentevents.co?subject=${subject}&body=${body}`;
    
    toast.success("Opening email with your rankings...");
  }

  return (
    <div className="min-h-screen py-20">
      <div className="container max-w-4xl">
        <AnimatedSection>
          <div className="mb-12 text-center">
            <h1 className="text-foreground mb-6">Prioritize Your Meetings</h1>
            <div className="gold-divider max-w-md mx-auto mb-8"></div>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              Drag and drop to rank all {attendees.length} attendees in order of meeting priority. Your rankings will help us 
              schedule the most valuable meetings for your team.
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={100}>
          <div className="glass-card p-6 bg-accent/10 border-accent/30 rounded-lg mb-8">
            <p className="text-sm text-foreground/90 leading-relaxed text-center">
              <strong className="text-accent">Instructions:</strong> Click and drag the grip icon to reorder attendees. 
              Your top priorities should be at the top. When finished, click Submit to email your rankings to clientsuccess@recruitmentevents.co
            </p>
          </div>
        </AnimatedSection>

        <div className="space-y-3 mb-12">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={rankedAttendees.map((a) => a.id)}
              strategy={verticalListSortingStrategy}
            >
              {rankedAttendees.map((attendee, index) => (
                <SortableAttendee
                  key={attendee.id}
                  attendee={attendee}
                  rank={index + 1}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <AnimatedSection delay={200}>
          <div className="flex justify-center">
            <Button
              onClick={submitRankings}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-heading gap-2 px-8"
            >
              <Send className="w-5 h-5" />
              Submit Rankings
            </Button>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            This will open your email client with the rankings pre-filled
          </p>
        </AnimatedSection>
      </div>
    </div>
  );
}
