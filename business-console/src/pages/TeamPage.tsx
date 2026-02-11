import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  UserCog,
  Plus,
  Search,
  Mail,
  Phone,
  Clock,
  MoreHorizontal,
  Shield,
  Calendar,
} from 'lucide-react';

export function TeamPage() {
  // Mock team members for demo
  const team = [
    {
      id: 1,
      name: 'Alex Martinez',
      email: 'alex@goldenfork.com',
      phone: '(555) 123-4567',
      role: 'manager',
      department: 'Front of House',
      schedule: 'Mon-Fri, 9AM-5PM',
      status: 'active',
      hireDate: '2022-03-15',
    },
    {
      id: 2,
      name: 'Maria Chen',
      email: 'maria@goldenfork.com',
      phone: '(555) 234-5678',
      role: 'server',
      department: 'Front of House',
      schedule: 'Thu-Mon, 4PM-11PM',
      status: 'active',
      hireDate: '2023-06-01',
    },
    {
      id: 3,
      name: 'James Wilson',
      email: 'james@goldenfork.com',
      phone: '(555) 345-6789',
      role: 'chef',
      department: 'Kitchen',
      schedule: 'Tue-Sat, 2PM-10PM',
      status: 'active',
      hireDate: '2021-09-20',
    },
    {
      id: 4,
      name: 'Sophie Taylor',
      email: 'sophie@goldenfork.com',
      phone: '(555) 456-7890',
      role: 'server',
      department: 'Front of House',
      schedule: 'Wed-Sun, 11AM-7PM',
      status: 'active',
      hireDate: '2024-01-08',
    },
    {
      id: 5,
      name: 'David Kim',
      email: 'david@goldenfork.com',
      phone: '(555) 567-8901',
      role: 'bartender',
      department: 'Bar',
      schedule: 'Thu-Mon, 5PM-12AM',
      status: 'on_leave',
      hireDate: '2022-11-10',
    },
  ];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'manager':
        return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      case 'chef':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'server':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'bartender':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'host':
        return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      default:
        return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/10 text-emerald-400';
      case 'on_leave':
        return 'bg-amber-500/10 text-amber-400';
      case 'inactive':
        return 'bg-muted text-muted-foreground';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Team</h1>
          <p className="text-muted-foreground mt-1">
            Manage your staff, schedules, and permissions
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Team Member
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search team members..."
          className="w-full pl-10 pr-4 py-2 bg-secondary/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-foreground">12</p>
            <p className="text-sm text-muted-foreground">Total Staff</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-emerald-400">10</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-amber-400">2</p>
            <p className="text-sm text-muted-foreground">On Leave</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-blue-400">8</p>
            <p className="text-sm text-muted-foreground">On Shift Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Team List */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Team Members</CardTitle>
          <CardDescription>All staff and their current status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {team.map((member) => (
              <div
                key={member.id}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground">{member.name}</p>
                      <Badge className={getRoleColor(member.role)}>
                        <Shield className="h-3 w-3 mr-1" />
                        {member.role}
                      </Badge>
                      <Badge variant="secondary" className={getStatusColor(member.status)}>
                        {member.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{member.department}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {member.phone}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 ml-16 md:ml-0">
                  <div className="text-right space-y-1">
                    <p className="text-sm text-foreground flex items-center gap-1 justify-end">
                      <Clock className="h-3.5 w-3.5" />
                      {member.schedule}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                      <Calendar className="h-3 w-3" />
                      Hired: {member.hireDate}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
