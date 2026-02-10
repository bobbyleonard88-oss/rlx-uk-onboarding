/**
 * RLX Onboarding - Meeting Prioritization Page
 * Design: Luxury Editorial
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
import { GripVertical, Download, Save, Building2, Briefcase, Users } from "lucide-react";
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
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`glass-card p-4 rounded-lg flex items-center gap-4 cursor-move hover:border-accent/50 transition-all ${
        isDragging ? "z-50" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-3">
        <GripVertical className="w-5 h-5 text-muted-foreground" />
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-accent/30 flex-shrink-0">
          <span className="text-lg font-display font-bold text-accent">{rank}</span>
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
            <span>{attendee.budgetAuthority}</span>
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
    useSensor(PointerSensor),
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

  function saveRankings() {
    const ids = rankedAttendees.map((a) => a.id);
    localStorage.setItem("rlx-meeting-priorities", JSON.stringify(ids));
    toast.success("Rankings saved successfully!");
  }

  function exportRankings() {
    const csv = [
      "Rank,First Name,Last Name,Job Title,Company,Industry,Budget Authority",
      ...rankedAttendees.map((a, i) =>
        [
          i + 1,
          a.firstName,
          a.lastName,
          a.jobTitle,
          a.company,
          a.industry,
          a.budgetAuthority,
        ]
          .map((field) => `"${field}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rlx-meeting-priorities.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Rankings exported successfully!");
  }

  return (
    <div className="min-h-screen py-20">
      <div className="container max-w-4xl">
        <AnimatedSection>
          <div className="mb-12 text-center">
            <h1 className="text-foreground mb-6">Prioritize Your Meetings</h1>
            <div className="gold-divider max-w-md mx-auto mb-8"></div>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              Drag and drop to rank all 47 attendees in order of meeting priority. Your rankings will help us 
              schedule the most valuable meetings for your team.
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={100}>
          <div className="flex gap-3 mb-8 justify-center">
            <Button
              onClick={saveRankings}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-heading gap-2"
            >
              <Save className="w-4 h-4" />
              Save Rankings
            </Button>
            <Button
              onClick={exportRankings}
              variant="outline"
              className="font-heading gap-2 border-accent/30 hover:border-accent hover:bg-accent/10"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={200}>
          <div className="glass-card p-6 bg-accent/10 border-accent/30 rounded-lg mb-8">
            <p className="text-sm text-foreground/90 leading-relaxed text-center">
              <strong className="text-accent">Tip:</strong> Click and drag the grip icon on the left of each card 
              to reorder. Your top priorities should be at the top of the list.
            </p>
          </div>
        </AnimatedSection>

        <div className="space-y-3">
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

        <AnimatedSection delay={300}>
          <div className="mt-12 flex gap-3 justify-center">
            <Button
              onClick={saveRankings}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-heading gap-2"
            >
              <Save className="w-5 h-5" />
              Save Rankings
            </Button>
            <Button
              onClick={exportRankings}
              size="lg"
              variant="outline"
              className="font-heading gap-2 border-accent/30 hover:border-accent hover:bg-accent/10"
            >
              <Download className="w-5 h-5" />
              Export CSV
            </Button>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
