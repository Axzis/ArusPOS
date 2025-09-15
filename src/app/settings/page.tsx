"use client"

import React, { useState } from 'react';
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

export default function SettingsPage() {
    const [canEdit, setCanEdit] = useState(false);

    // This is a placeholder for the LLM logic to determine if a user can edit settings.
    const handlePermissionCheck = (checked: boolean) => {
        // In a real app, this might involve an API call to an AI service.
        // For this demo, we'll just toggle the state.
        setCanEdit(checked);
    }

  return (
    <div className="flex flex-col gap-6">
        <h1 className="text-lg font-semibold md:text-2xl">Settings</h1>

        <Card>
            <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Manage editing permissions.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center space-x-2">
                    <Switch id="edit-mode" checked={canEdit} onCheckedChange={handlePermissionCheck} />
                    <Label htmlFor="edit-mode">Enable Settings Editing</Label>
                </div>
                 <p className='text-sm text-muted-foreground mt-2'>
                    This simulates an admin granting edit permissions. An LLM could decide if this option is available based on user role or other factors.
                </p>
            </CardContent>
        </Card>

        <form>
            <fieldset disabled={!canEdit}>
                <div className="grid gap-6">
                    <Card>
                    <CardHeader>
                        <CardTitle>Store Details</CardTitle>
                        <CardDescription>Update your store's name and contact information.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="store-name">Store Name</Label>
                                <Input id="store-name" defaultValue="Arus POS Demo" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="store-address">Address</Label>
                                <Textarea id="store-address" defaultValue="123 Main St, Anytown, USA" />
                            </div>
                        </div>
                    </CardContent>
                    </Card>

                    <Card>
                    <CardHeader>
                        <CardTitle>Appearance</CardTitle>
                        <CardDescription>Customize the look and feel of your POS.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="theme">Theme</Label>
                                <Select defaultValue="light">
                                <SelectTrigger id="theme">
                                    <SelectValue placeholder="Select theme" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="light">Light</SelectItem>
                                    <SelectItem value="dark">Dark</SelectItem>
                                </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="primary-color">Primary Color</Label>
                                <Input id="primary-color" type='color' defaultValue="#2980b9" />
                            </div>
                        </div>
                    </CardContent>
                    </Card>
                    <div className="flex justify-end">
                        <Button>Save Settings</Button>
                    </div>
                </div>
            </fieldset>
        </form>
    </div>
  )
}
