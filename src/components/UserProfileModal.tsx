import React, { useState, useRef } from 'react'
import {
  X,
  Camera,
  Trash2,
  KeyRound,
  ShieldCheck,
  User,
  Check,
  AlertCircle,
  Sparkles,
  Loader2,
  Store,
  Crown
} from 'lucide-react'
import { compressImageFile } from '../utils/image'
import { db } from '../db'
import type { UserAccount, UserRole } from '../types'

interface UserProfileModalProps {
  isOpen: boolean
  onClose: () => void
  currentUserId?: number
  currentUsername?: string
  currentCashierName: string
  currentCashierRole: string
  currentStoreName?: string
  currentAvatarUrl?: string
  isMasterAdmin?: boolean
  onUpdateAvatar: (avatarUrl?: string) => void
}

export function UserProfileModal({
  isOpen,
  onClose,
  currentUserId,
  currentUsername,
  currentCashierName,
  currentCashierRole,
  currentStoreName,
  currentAvatarUrl,
  isMasterAdmin = false,
  onUpdateAvatar
}: UserProfileModalProps): React.JSX.Element | null {
  const [avatar, setAvatar] = useState<string | undefined>(currentAvatarUrl)
  const [isUploading, setIsUploading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // PIN Change State
  const [isChangingPin, setIsChangingPin] = useState(false)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinLoading, setPinLoading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const initials = currentCashierName
    ? currentCashierName
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'U'

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 3500)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPG, PNG, WebP).', 'error')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('Image file is too large. Maximum size is 10MB.', 'error')
      return
    }

    setIsUploading(true)
    try {
      // Compress and resize client-side to optimal 320x320 WebP/JPEG
      const compressedDataUrl = await compressImageFile(file, 320, 320, 0.85)

      // Find user in database
      let user: UserAccount | undefined
      if (currentUserId) {
        user = await db.users.get(currentUserId)
      } else if (currentUsername) {
        user = await db.users.where('username').equalsIgnoreCase(currentUsername).first()
      }

      if (user && user.id) {
        await db.users.update(user.id, { avatar_url: compressedDataUrl })
      } else if (currentUsername) {
        // If user record doesn't exist yet (e.g. Master Admin Ian first upload), create or update it
        const existing = await db.users.where('username').equalsIgnoreCase(currentUsername).first()
        if (existing?.id) {
          await db.users.update(existing.id, { avatar_url: compressedDataUrl })
        } else {
          await db.users.add({
            username: currentUsername,
            name: currentCashierName,
            role: isMasterAdmin ? 'ADMIN' : 'CASHIER',
            pin: '1234',
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            avatar_url: compressedDataUrl,
            store_name: currentStoreName || 'PLATFORM_HQ',
            is_owner: isMasterAdmin
          })
        }
      }

      setAvatar(compressedDataUrl)
      onUpdateAvatar(compressedDataUrl)
      showToast('Profile photo updated successfully!')
    } catch (err) {
      console.error('Failed to upload profile photo:', err)
      showToast('Failed to process image. Please try another photo.', 'error')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemovePhoto = async () => {
    if (!confirm('Are you sure you want to remove your profile photo?')) return

    setIsUploading(true)
    try {
      let user: UserAccount | undefined
      if (currentUserId) {
        user = await db.users.get(currentUserId)
      } else if (currentUsername) {
        user = await db.users.where('username').equalsIgnoreCase(currentUsername).first()
      }

      if (user && user.id) {
        await db.users.update(user.id, { avatar_url: undefined })
      }

      setAvatar(undefined)
      onUpdateAvatar(undefined)
      showToast('Profile photo removed.')
    } catch (err) {
      console.error('Failed to remove photo:', err)
      showToast('Failed to remove profile photo.', 'error')
    } finally {
      setIsUploading(false)
    }
  }

  const handleUpdatePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPin || newPin.length < 4) {
      showToast('New PIN must be at least 4 digits.', 'error')
      return
    }
    if (newPin !== confirmPin) {
      showToast('New PIN and confirmation do not match.', 'error')
      return
    }

    setPinLoading(true)
    try {
      let user: UserAccount | undefined
      if (currentUserId) {
        user = await db.users.get(currentUserId)
      } else if (currentUsername) {
        user = await db.users.where('username').equalsIgnoreCase(currentUsername).first()
      }

      if (user && user.pin && user.pin !== currentPin && !isMasterAdmin) {
        showToast('Current PIN is incorrect.', 'error')
        setPinLoading(false)
        return
      }

      if (user && user.id) {
        await db.users.update(user.id, { pin: newPin })
      }

      showToast('Security PIN changed successfully!')
      setIsChangingPin(false)
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
    } catch (err) {
      console.error('Failed to update PIN:', err)
      showToast('Failed to update PIN.', 'error')
    } finally {
      setPinLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md glass-panel rounded-3xl border border-gold/40 shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-zinc-950/40">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-gold/30 flex items-center justify-center text-gold-light">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">Account Profile</h3>
              <p className="text-[11px] text-stone-400 font-mono">Terminal Staff Identity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-5 mt-4 p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold animate-fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/15 border-red-500/30 text-red-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <Check className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 space-y-6">
          {/* Avatar Upload Hub */}
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-gold/60 shadow-glow-gold bg-zinc-900 flex items-center justify-center relative">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={currentCashierName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-amber-300 to-[#D4AF37] flex items-center justify-center text-obsidian-950 font-serif font-black text-2xl">
                    {initials}
                  </div>
                )}

                {/* Loading overlay */}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-gold animate-spin" />
                  </div>
                )}
              </div>

              {/* Quick camera trigger button on avatar */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute -bottom-1.5 -right-1.5 p-2 rounded-xl bg-amber-500 text-obsidian-950 font-bold shadow-lg hover:bg-amber-400 hover:scale-105 transition-all"
                title="Upload Photo"
              >
                <Camera className="w-4 h-4" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <div>
              <h4 className="text-lg font-bold text-white flex items-center justify-center gap-1.5">
                {isMasterAdmin && <Crown className="w-4 h-4 text-gold" />}
                <span>{currentCashierName}</span>
              </h4>
              {currentUsername && (
                <p className="text-xs font-mono text-stone-400">@{currentUsername}</p>
              )}
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-gold/30 text-gold-light text-[10px] font-mono font-bold uppercase tracking-wider">
                  {currentCashierRole}
                </span>
                {currentStoreName && (
                  <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-stone-300 text-[10px] font-mono flex items-center gap-1">
                    <Store className="w-3 h-3 text-stone-400" />
                    <span>{currentStoreName}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Photo Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="btn-press px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-gold/40 text-gold-light text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{avatar ? 'Change Photo' : 'Upload Photo'}</span>
              </button>

              {avatar && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={isUploading}
                  className="btn-press px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>
            <p className="text-[10px] text-stone-500 font-mono">
              Auto-compressed to high-speed offline profile image.
            </p>
          </div>

          {/* Security PIN Section */}
          <div className="border-t border-white/[0.08] pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-gold-light" />
                <span className="text-xs font-semibold text-white">Security PIN</span>
              </div>
              <button
                type="button"
                onClick={() => setIsChangingPin(!isChangingPin)}
                className="text-xs text-gold-light hover:underline font-mono"
              >
                {isChangingPin ? 'Cancel' : 'Change PIN'}
              </button>
            </div>

            {isChangingPin && (
              <form onSubmit={handleUpdatePinSubmit} className="space-y-2.5 animate-fade-in pt-1">
                {!isMasterAdmin && (
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1">
                      Current PIN
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Enter current PIN"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950/70 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-gold"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1">
                    New PIN (4 to 6 Digits)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Enter new PIN"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950/70 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1">
                    Confirm New PIN
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Re-enter new PIN"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950/70 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-gold"
                  />
                </div>
                <button
                  type="submit"
                  disabled={pinLoading}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-400 via-gold to-amber-500 text-obsidian-950 font-bold text-xs shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
                >
                  {pinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Save New PIN</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-zinc-950/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn-press px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-stone-200 text-xs font-semibold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
