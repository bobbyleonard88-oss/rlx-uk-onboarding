/**
 * Admin Event Settings Page
 * Allows admins to configure the event name, dates, venue, and matching weights.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import AdminHeader from "@/components/AdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Calendar, MapPin, Settings, Zap, Plus, CheckCircle } from "lucide-react";
import { format } from "date-fns";

const eventSchema = z.object({
  name: z.string().min(1, "Event name is required"),
  tagline: z.string().optional(),
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  matchWeights: z.string().optional(),
  isActive: z.boolean().optional(),
});

type EventFormValues = z.infer<typeof eventSchema>;

function EventForm({
  defaultValues,
  onSuccess,
  eventId,
}: {
  defaultValues?: Partial<EventFormValues>;
  onSuccess: () => void;
  eventId?: number;
}) {
  const createEvent = trpc.event.create.useMutation({
    onSuccess: () => {
      toast.success("Event created successfully");
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateEvent = trpc.event.update.useMutation({
    onSuccess: () => {
      toast.success("Event settings saved");
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: defaultValues ?? {
      name: "",
      tagline: "",
      venueName: "",
      venueAddress: "",
      startDate: "",
      endDate: "",
      matchWeights: "",
      isActive: false,
    },
  });

  const isActive = watch("isActive");

  const onSubmit = (data: EventFormValues) => {
    if (eventId) {
      updateEvent.mutate({ id: eventId, ...data });
    } else {
      createEvent.mutate(data);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Event Identity */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="name" className="text-sm font-medium text-slate-200">
            Event Name <span className="text-red-400">*</span>
          </Label>
          <Input
            id="name"
            {...register("name")}
            placeholder="e.g. RLX UK 2026"
            className="mt-1.5 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500"
          />
          {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
        </div>

        <div>
          <Label htmlFor="tagline" className="text-sm font-medium text-slate-200">
            Tagline
          </Label>
          <Input
            id="tagline"
            {...register("tagline")}
            placeholder="e.g. The UK's Premier Talent Acquisition Summit"
            className="mt-1.5 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500"
          />
        </div>
      </div>

      <Separator className="border-slate-700" />

      {/* Dates */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Event Dates</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate" className="text-sm font-medium text-slate-200">
              Start Date <span className="text-red-400">*</span>
            </Label>
            <Input
              id="startDate"
              type="datetime-local"
              {...register("startDate")}
              className="mt-1.5 bg-slate-800/50 border-slate-600 text-white focus:border-purple-500"
            />
            {errors.startDate && <p className="mt-1 text-xs text-red-400">{errors.startDate.message}</p>}
          </div>
          <div>
            <Label htmlFor="endDate" className="text-sm font-medium text-slate-200">
              End Date <span className="text-red-400">*</span>
            </Label>
            <Input
              id="endDate"
              type="datetime-local"
              {...register("endDate")}
              className="mt-1.5 bg-slate-800/50 border-slate-600 text-white focus:border-purple-500"
            />
            {errors.endDate && <p className="mt-1 text-xs text-red-400">{errors.endDate.message}</p>}
          </div>
        </div>
      </div>

      <Separator className="border-slate-700" />

      {/* Venue */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Venue</h3>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="venueName" className="text-sm font-medium text-slate-200">
              Venue Name
            </Label>
            <Input
              id="venueName"
              {...register("venueName")}
              placeholder="e.g. The Grove Hotel Spa & Golf"
              className="mt-1.5 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500"
            />
          </div>
          <div>
            <Label htmlFor="venueAddress" className="text-sm font-medium text-slate-200">
              Venue Address
            </Label>
            <Textarea
              id="venueAddress"
              {...register("venueAddress")}
              placeholder="Chandler's Cross, Hertfordshire, WD3 4TG"
              rows={2}
              className="mt-1.5 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500 resize-none"
            />
          </div>
        </div>
      </div>

      <Separator className="border-slate-700" />

      {/* Matching Weights */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Matching Weights</h3>
        </div>
        <div>
          <Label htmlFor="matchWeights" className="text-sm font-medium text-slate-200">
            Weight Configuration (JSON)
          </Label>
          <Textarea
            id="matchWeights"
            {...register("matchWeights")}
            placeholder={'{\n  "painPoints": 0.35,\n  "industry": 0.20,\n  "companySize": 0.15,\n  "budget": 0.20,\n  "tools": 0.10\n}'}
            rows={6}
            className="mt-1.5 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500 font-mono text-sm resize-none"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Optional. Adjust the relative importance of each matching criterion. Values should sum to 1.0.
          </p>
        </div>
      </div>

      <Separator className="border-slate-700" />

      {/* Active Status */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-200">Set as Active Event</p>
          <p className="text-xs text-slate-500 mt-0.5">
            The active event is visible to sponsors and delegates. Only one event can be active at a time.
          </p>
        </div>
        <Switch
          checked={isActive ?? false}
          onCheckedChange={(v) => setValue("isActive", v)}
          className="data-[state=checked]:bg-purple-600"
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={isSubmitting || createEvent.isPending || updateEvent.isPending}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6"
        >
          {eventId ? "Save Changes" : "Create Event"}
        </Button>
      </div>
    </form>
  );
}

export default function AdminEventSettings() {
  const { data: events, refetch } = trpc.event.getAll.useQuery();
  const setActive = trpc.event.setActive.useMutation({
    onSuccess: () => {
      toast.success("Active event updated");
      refetch();
    },
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const activeEvent = events?.find((e) => e.isActive === 1);
  const editingEvent = editingId !== null ? events?.find((e) => e.id === editingId) : null;

  return (
    <div className="min-h-screen bg-slate-950">
      <AdminHeader />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-white flex items-center gap-2">
              <Settings className="w-6 h-6 text-purple-400" />
              Event Settings
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              Configure the event details, venue, and matching algorithm weights.
            </p>
          </div>
          {!showCreateForm && editingId === null && (
            <Button
              onClick={() => setShowCreateForm(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Event
            </Button>
          )}
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <Card className="glass-card border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-white text-lg">Create New Event</CardTitle>
              <CardDescription className="text-slate-400">
                Set up a new event. You can configure the agenda separately after creation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EventForm
                onSuccess={() => {
                  setShowCreateForm(false);
                  refetch();
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Edit Form */}
        {editingId !== null && editingEvent && (
          <Card className="glass-card border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-white text-lg">Edit Event</CardTitle>
            </CardHeader>
            <CardContent>
              <EventForm
                eventId={editingId}
                defaultValues={{
                  name: editingEvent.name,
                  tagline: editingEvent.tagline ?? "",
                  venueName: editingEvent.venueName ?? "",
                  venueAddress: editingEvent.venueAddress ?? "",
                  startDate: editingEvent.startDate
                    ? format(new Date(editingEvent.startDate), "yyyy-MM-dd'T'HH:mm")
                    : "",
                  endDate: editingEvent.endDate
                    ? format(new Date(editingEvent.endDate), "yyyy-MM-dd'T'HH:mm")
                    : "",
                  matchWeights: editingEvent.matchWeights ?? "",
                  isActive: editingEvent.isActive === 1,
                }}
                onSuccess={() => {
                  setEditingId(null);
                  refetch();
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Events List */}
        {events && events.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">All Events</h2>
            {events.map((event) => (
              <Card
                key={event.id}
                className={`glass-card transition-all ${
                  event.isActive === 1
                    ? "border-purple-500/60 shadow-purple-500/10 shadow-lg"
                    : "border-slate-700/50"
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {event.isActive === 1 && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-300 bg-purple-500/20 border border-purple-500/30 rounded-full px-2 py-0.5">
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </span>
                        )}
                        <h3 className="text-base font-semibold text-white truncate">{event.name}</h3>
                      </div>
                      {event.tagline && (
                        <p className="text-sm text-slate-400 mb-2">{event.tagline}</p>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        {event.venueName && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.venueName}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(event.startDate), "d MMM yyyy")} —{" "}
                          {format(new Date(event.endDate), "d MMM yyyy")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {event.isActive !== 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActive.mutate({ id: event.id })}
                          className="border-slate-600 text-slate-300 hover:text-white hover:border-purple-500 text-xs h-8"
                        >
                          Set Active
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowCreateForm(false);
                          setEditingId(event.id);
                        }}
                        className="border-slate-600 text-slate-300 hover:text-white hover:border-purple-500 text-xs h-8"
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {events?.length === 0 && !showCreateForm && (
          <div className="text-center py-16">
            <Settings className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-400 mb-2">No Events Configured</h3>
            <p className="text-slate-500 text-sm mb-6">
              Create your first event to get started. You can configure the full agenda after creation.
            </p>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Event
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
