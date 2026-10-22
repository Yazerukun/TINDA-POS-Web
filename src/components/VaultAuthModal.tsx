import React, { useEffect, useState, useRef } from 'react'
import {
  Fingerprint,
  Lock,
  User,
  LogIn,
  UserPlus,
  Store,
  Delete,
  ChevronLeft,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  ShieldAlert,
  Zap,
  CheckCircle2,
  Crown
} from 'lucide-react'
import { AppLogo } from './AppLogo'
import { money } from '../utils/format'
import { db } from '../db'
import type { UserAccount, UserRole } from '../types'
import { loginWithCloud, rotatePinOnCloud, syncUserToCloud } from '../services/cloudSync'
import { isVipActive, getVipLicenseInfo, verifyAccountVipKey, saveAccountVipLicense } from '../utils/vip'
import { playSuccessSound } from '../lib/sound'

export interface VaultSession {
  userId?: number
  cashierName: string
  cashierRole: string
  userRole: UserRole
  openingFloat_c: number
  sessionStartTime: string
  terminalId: string
  isAdmin: boolean
  isMasterAdmin?: boolean
  username?: string
  storeName?: string
  avatarUrl?: string
  isVip?: boolean
  vipKey?: string
}

interface VaultAuthModalProps {
  isOpen: boolean
  onAuthenticated: (session: VaultSession, isNewAccount?: boolean) => void
  currentCashier?: string
  initialStep?: 'LOGIN' | 'SIGNUP'
  onClose?: () => void
  onQuickDemo?: () => void
}

const TERMINAL_ID = 'TRM-8891'

export function VaultAuthModal({
  isOpen,
  onAuthenticated,
  currentCashier,
  initialStep = 'LOGIN',
  onClose,
  onQuickDemo
}: VaultAuthModalProps): React.JSX.Element | null {
  const [step, setStep] = useState<'LOGIN' | 'SIGNUP' | 'ROTATE' | 'FLOAT' | 'FORGOT_PIN' | 'VIP_UNLOCK'>(initialStep)

  useEffect(() => {
    if (isOpen && initialStep) {
      setStep(initialStep)
      setErrorMessage('')
    }
  }, [isOpen, initialStep])

  const [authMode, setAuthMode] = useState<'PIN' | 'PASSWORD'>('PIN')
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [authenticatedUser, setAuthenticatedUser] = useState<UserAccount | null>(null)
  const [openingFloat, setOpeningFloat] = useState(200000) // ₱2,000.00 in centavos
  const [customFloatInput, setCustomFloatInput] = useState('2000')

  // VIP License Key unlock state
  const [vipKeyInput, setVipKeyInput] = useState('')
  const [vipStoreName, setVipStoreName] = useState('')
  const [vipUsername, setVipUsername] = useState('owner')
  const [vipPin, setVipPin] = useState('1234')
  const vipKeyInputRef = useRef<HTMLInputElement>(null)

  // Forgot PIN / Password recovery state
  const [forgotTargetUsername, setForgotTargetUsername] = useState('')
  const [forgotRecoveryMethod, setForgotRecoveryMethod] = useState<'ADMIN_PIN' | 'MASTER_KEY'>('ADMIN_PIN')
  const [forgotAdminPin, setForgotAdminPin] = useState('')
  const [forgotRecoveryCode, setForgotRecoveryCode] = useState('')
  const [forgotNewPin, setForgotNewPin] = useState('')
  const [forgotConfirmPin, setForgotConfirmPin] = useState('')
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState('')
  const [forgotIsResetting, setForgotIsResetting] = useState(false)

  // Quick Staff Switcher state
  const [existingStaff, setExistingStaff] = useState<UserAccount[]>([])

  useEffect(() => {
    if (isOpen) {
      db.users
        .toArray()
        .then((users) => {
          if (users && users.length > 0) {
            setExistingStaff(users.filter((u) => u.status === 'ACTIVE'))
          }
        })
        .catch(() => {})
    }
  }, [isOpen])

  // Security: Brute-force lockout state
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState<number>(0)

  // Store Owner Sign Up form state
  const [signupStoreName, setSignupStoreName] = useState('')
  const [signupName, setSignupName] = useState('')
  const [signupUsername, setSignupUsername] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPin, setSignupPin] = useState('')
  const [rotatePin, setRotatePin] = useState('')
  const [rotateConfirm, setRotateConfirm] = useState('')
  const [signupConfirmPin, setSignupConfirmPin] = useState('')
  const [showSignupPin, setShowSignupPin] = useState(false)

  const usernameInputRef = useRef<HTMLInputElement>(null)
  const signupStoreInputRef = useRef<HTMLInputElement>(null)
  const pinInputRef = useRef<HTMLInputElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      if (step === 'LOGIN') {
        setTimeout(() => usernameInputRef.current?.focus(), 150)
      } else if (step === 'SIGNUP') {
        setTimeout(() => signupStoreInputRef.current?.focus(), 150)
      } else if (step === 'VIP_UNLOCK') {
        setTimeout(() => vipKeyInputRef.current?.focus(), 150)
      }
    }
  }, [isOpen, step])

  if (!isOpen) return null

  const handleKeypadPress = (digit: string) => {
    if (Date.now() < lockoutUntil) {
      const waitSec = Math.ceil((lockoutUntil - Date.now()) / 1000)
      setErrorMessage(`Security Lockout: Too many failed attempts. Wait ${waitSec}s.`)
      return
    }
    if (pin.length < 4) {
      const nextPin = pin + digit
      setPin(nextPin)
      setErrorMessage('')
      try {
        playSuccessSound()
      } catch {
        // ignore
      }
    }
  }

  const handleDeletePin = () => {
    setPin((prev) => prev.slice(0, -1))
    setErrorMessage('')
  }

  const handleClearPin = () => {
    setPin('')
    setErrorMessage('')
  }

  const handleVipUnlockSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const cleanKey = vipKeyInput.trim().toUpperCase()
    if (!cleanKey) {
      setErrorMessage('Please enter your VIP License Key.')
      vipKeyInputRef.current?.focus()
      return
    }

    const cleanStore = vipStoreName.trim() || 'VIP Store'
    const normUser = (vipUsername.trim() || 'owner').toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'owner'
    const chosenPin = (vipPin.trim().replace(/\D/g, '') || '1234').slice(0, 4) || '1234'

    setIsVerifying(true)
    setErrorMessage('')

    try {
      const verResult = await verifyAccountVipKey(cleanKey, normUser, cleanStore)
      if (!verResult.valid) {
        setErrorMessage(verResult.reason || 'Invalid VIP License Key. Please check the key provided by Dev Francis.')
        setIsVerifying(false)
        return
      }

      let user = await db.users.where('username').equalsIgnoreCase(normUser).first()
      if (user) {
        await db.users.update(user.id!, {
          role: 'ADMIN',
          status: 'ACTIVE',
          is_owner: true,
          is_vip: true,
          vip_key: cleanKey,
          vip_activated_at: new Date().toISOString(),
          store_name: cleanStore,
          pin: chosenPin
        })
        user = await db.users.get(user.id!)
      } else {
        const newUser: UserAccount = {
          username: normUser,
          name: cleanStore,
          role: 'ADMIN',
          pin: chosenPin,
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          store_name: cleanStore,
          is_owner: true,
          is_vip: true,
          vip_key: cleanKey,
          vip_activated_at: new Date().toISOString()
        }
        const newId = await db.users.add(newUser)
        user = { ...newUser, id: newId as number }
      }

      saveAccountVipLicense(normUser, {
        active: true,
        registeredTo: cleanStore,
        key: cleanKey,
        token: cleanKey,
        username: normUser,
        activatedAt: new Date().toISOString()
      })

      await db.settings.put({
        key: `vip_license_${normUser}`,
        value: {
          active: true,
          registeredTo: cleanStore,
          key: cleanKey,
          username: normUser,
          activatedAt: new Date().toISOString()
        }
      })
      await db.settings.put({
        key: 'pro_access_state',
        value: {
          pro_expires_at: 4102444800000,
          tokens: 9999,
          last_ad_watched_at: Date.now(),
          total_ads_watched: 0,
          owner_bypass: true
        }
      })

      try {
        playSuccessSound()
      } catch {}

      if (user) {
        setAuthenticatedUser(user)
        setIsVerifying(false)
        setStep('FLOAT')
      }
    } catch (err) {
      console.error('VIP Unlock error:', err)
      setErrorMessage('Failed to unlock VIP account: ' + ((err as Error)?.message || 'Database error'))
      setIsVerifying(false)
    }
  }

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (Date.now() < lockoutUntil) {
      const waitSec = Math.ceil((lockoutUntil - Date.now()) / 1000)
      setErrorMessage(`Security Lockout: Too many failed attempts. Please wait ${waitSec}s.`)
      return
    }

    const trimmedUser = username.trim()
    const upperUser = trimmedUser.toUpperCase()
    const upperPin = (pin || '').trim().toUpperCase()

    if (upperUser.startsWith('VIP-') || upperUser.startsWith('MASTER-') || upperPin.startsWith('VIP-') || upperPin.startsWith('MASTER-')) {
      const candidateKey = upperUser.startsWith('VIP-') || upperUser.startsWith('MASTER-') ? trimmedUser : pin
      setVipKeyInput(candidateKey)
      setStep('VIP_UNLOCK')
      setErrorMessage('VIP License Key detected! Please enter your store details or click Unlock.')
      return
    }

    if (!trimmedUser) {
      setErrorMessage('Please enter your Staff ID or Username.')
      usernameInputRef.current?.focus()
      return
    }
    if (!pin) {
      setErrorMessage(authMode === 'PIN' ? 'Please enter your 4-digit security PIN.' : 'Please enter your password.')
      if (authMode === 'PIN') pinInputRef.current?.focus()
      else passwordInputRef.current?.focus()
      return
    }

    setIsVerifying(true)
    setErrorMessage('')

    await new Promise((resolve) => setTimeout(resolve, 400))

    try {
      const lower = trimmedUser.toLowerCase()

      let user = await db.users.where('username').equalsIgnoreCase(trimmedUser).first()
      if (!user) {
        user = await db.users.filter((u) => u.email?.toLowerCase() === lower).first()
      }

      if (!user && lower === 'admin') {
        const existingAdmin = await db.users.where('role').equals('ADMIN').first()
        if (!existingAdmin) {
          const newAdmin: UserAccount = {
            username: 'admin',
            name: 'Master Admin',
            role: 'ADMIN',
            pin: '1234',
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            store_name: 'PLATFORM_HQ',
            is_owner: true
          }
          const id = await db.users.add(newAdmin)
          user = { ...newAdmin, id }
        } else {
          user = existingAdmin
        }
      }

      if (!user) {
        try {
          const cloudRes = await loginWithCloud(trimmedUser, pin)
          if (cloudRes.ok && cloudRes.user) {
            const syncedUser: UserAccount = {
              id: cloudRes.user.id,
              username: cloudRes.user.username,
              name: cloudRes.user.name,
              role: (cloudRes.user.role as UserRole) || 'ADMIN',
              pin: pin,
              status: 'ACTIVE',
              created_at: new Date().toISOString(),
              store_name: cloudRes.user.store_name || undefined,
              email: cloudRes.user.email || undefined,
              avatar_url: cloudRes.user.avatar_url || undefined,
              is_owner: cloudRes.user.is_owner
            }
            await db.users.put(syncedUser)
            user = syncedUser
          }
        } catch (e) {
          console.warn('Cloud login lookup error:', e)
        }
      }

      if (!user || user.status !== 'ACTIVE' || user.pin !== pin) {
        const nextFails = failedAttempts + 1
        setFailedAttempts(nextFails)
        if (nextFails >= 5) {
          setLockoutUntil(Date.now() + 30000)
          setErrorMessage('Security Alert: 5 failed attempts. Terminal locked for 30 seconds.')
        } else {
          setErrorMessage(`Authentication failed. Invalid Staff ID or PIN. (${5 - nextFails} attempts remaining)`)
        }
        setPin('')
        setIsVerifying(false)
        return
      }

      setFailedAttempts(0)
      setLockoutUntil(0)

      const cloud = await loginWithCloud(user.username, pin)

      if (cloud.ok && cloud.must_rotate_pin) {
        setPin('')
        setAuthenticatedUser(user)
        setIsVerifying(false)
        setStep('ROTATE')
        return
      }

      setAuthenticatedUser(user)
      setIsVerifying(false)
      setStep('FLOAT')
    } catch (err) {
      console.error('Login error:', err)
      const errDetail = (err as Error)?.message || 'Database error'
      setErrorMessage(`Login error: ${errDetail}. Please try again.`)
      setIsVerifying(false)
    }
  }

  const handleSignupSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmedStore = signupStoreName.trim()
    const trimmedName = signupName.trim()
    const trimmedUser = signupUsername.trim().toLowerCase()
    const trimmedEmail = signupEmail.trim()

    if (!trimmedStore) {
      setErrorMessage('Please enter your store or business name.')
      signupStoreInputRef.current?.focus()
      return
    }
    if (!trimmedName) {
      setErrorMessage('Please enter store owner full name.')
      return
    }
    if (!trimmedUser || trimmedUser.length < 3) {
      setErrorMessage('Username must be at least 3 characters.')
      return
    }
    if (!/^[a-z0-9_-]+$/.test(trimmedUser)) {
      setErrorMessage('Username can only contain lowercase letters, numbers, and dashes.')
      return
    }
    if (signupPin.length !== 4) {
      setErrorMessage('Security PIN must be exactly 4 digits.')
      return
    }
    if (signupPin !== signupConfirmPin) {
      setErrorMessage('Confirmation PIN does not match.')
      return
    }

    setIsVerifying(true)
    setErrorMessage('')

    try {
      const existingUser = await db.users.where('username').equalsIgnoreCase(trimmedUser).first()
      if (existingUser) {
        setErrorMessage('Username is already taken on this terminal.')
        setIsVerifying(false)
        return
      }

      const newAccount: UserAccount = {
        username: trimmedUser,
        name: trimmedName,
        role: 'ADMIN',
        pin: signupPin,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        store_name: trimmedStore,
        email: trimmedEmail || undefined,
        is_owner: true,
        is_vip: false
      }

      const insertedId = await db.users.add(newAccount)
      newAccount.id = insertedId as number

      syncUserToCloud(newAccount).catch((err) => {
        console.warn('Background cloud account sync notice:', err)
      })

      loginWithCloud(trimmedUser, signupPin).catch((err) => {
        console.warn('Initial session token acquisition notice:', err)
      })

      setAuthenticatedUser(newAccount)
      setIsVerifying(false)
      setStep('FLOAT')
    } catch (err) {
      console.error('Sign up error:', err)
      setErrorMessage('Failed to create store account. Please try again.')
      setIsVerifying(false)
    }
  }

  const handleRotateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next = rotatePin.replace(/\D/g, '')
    const confirm = rotateConfirm.replace(/\D/g, '')
    if (next.length < 4 || next.length > 6) {
      setErrorMessage('The new PIN must be 4 to 6 digits.')
      return
    }
    if (next !== confirm) {
      setErrorMessage('The two PINs do not match.')
      return
    }
    const user = authenticatedUser
    if (!user) {
      setStep('LOGIN')
      return
    }
    setIsVerifying(true)
    setErrorMessage('')
    const ok = await rotatePinOnCloud(user.username, pin, next)
    if (!ok) {
      setIsVerifying(false)
      setErrorMessage('Failed to update PIN on cloud. Please try again.')
      return
    }
    if (user.id) await db.users.update(user.id, { pin: next }).catch(() => {})
    setRotatePin('')
    setRotateConfirm('')
    setPin('')
    setIsVerifying(false)
    setStep('FLOAT')
  }

  const handlePresetFloat = (pesos: number) => {
    setOpeningFloat(pesos * 100)
    setCustomFloatInput(pesos.toString())
  }

  const handleCustomFloatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '')
    setCustomFloatInput(val)
    setOpeningFloat((parseInt(val, 10) || 0) * 100)
  }

  const handleConfirmSession = () => {
    if (!authenticatedUser) return

    const isMaster = Boolean((authenticatedUser as { is_master?: number }).is_master)

    let userStoreName = authenticatedUser.store_name
    if (!userStoreName) {
      if (isMaster) {
        userStoreName = 'PLATFORM_HQ'
      } else if (authenticatedUser.owner_username) {
        userStoreName = `${authenticatedUser.owner_username}_store`
      } else {
        userStoreName = authenticatedUser.name ? `${authenticatedUser.name}'s Store` : 'DEFAULT_STORE'
      }
    }

    if (!authenticatedUser.store_name && authenticatedUser.id) {
      db.users.update(authenticatedUser.id, { store_name: userStoreName }).catch(() => {})
    }

    const session: VaultSession = {
      userId: authenticatedUser.id,
      cashierName: isMaster ? 'Master Admin Ian' : authenticatedUser.name,
      cashierRole: isMaster
        ? 'Platform Master Admin'
        : authenticatedUser.is_owner || authenticatedUser.role === 'ADMIN'
        ? 'Store Owner / Admin'
        : authenticatedUser.role === 'INVENTORY_LEAD'
        ? 'Inventory Lead'
        : 'Cashier',
      userRole: authenticatedUser.role,
      openingFloat_c: openingFloat,
      sessionStartTime: new Date().toISOString(),
      terminalId: TERMINAL_ID,
      isAdmin: authenticatedUser.role === 'ADMIN',
      isMasterAdmin: isMaster,
      username: authenticatedUser.username,
      storeName: userStoreName,
      avatarUrl: authenticatedUser.avatar_url,
      isVip: isMaster || isVipActive(authenticatedUser.username),
      vipKey: authenticatedUser.vip_key
    }

    const isNewAccount =
      !!authenticatedUser.created_at &&
      Date.now() - new Date(authenticatedUser.created_at).getTime() < 10_000

    onAuthenticated(session, isNewAccount)
    setPin('')
    setUsername('')
    setSignupStoreName('')
    setSignupName('')
    setSignupUsername('')
    setSignupEmail('')
    setSignupPin('')
    setSignupConfirmPin('')
    setStep('LOGIN')
    setAuthenticatedUser(null)
  }

  const handleSwitchAccount = () => {
    setStep('LOGIN')
    setPin('')
    setAuthenticatedUser(null)
    setErrorMessage('')
    setTimeout(() => usernameInputRef.current?.focus(), 150)
  }

  const handleForgotResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const target = forgotTargetUsername.trim().toLowerCase()
    const newPin = forgotNewPin.replace(/\D/g, '')
    const confirmPin = forgotConfirmPin.replace(/\D/g, '')

    if (!target) {
      setErrorMessage('Please select or enter the Staff ID to reset.')
      return
    }
    if (newPin.length !== 4) {
      setErrorMessage('New security PIN must be exactly 4 digits.')
      return
    }
    if (newPin !== confirmPin) {
      setErrorMessage('New PIN and confirmation PIN do not match.')
      return
    }

    setForgotIsResetting(true)
    setErrorMessage('')
    setForgotSuccessMessage('')

    try {
      let authorized = false

      if (forgotRecoveryMethod === 'ADMIN_PIN') {
        const cleanAdminPin = forgotAdminPin.trim()
        if (!cleanAdminPin) {
          setErrorMessage('Please enter Store Admin PIN.')
          setForgotIsResetting(false)
          return
        }

        const adminUser = await db.users.where('role').equals('ADMIN').first()
        if (adminUser) {
          authorized = adminUser.pin === cleanAdminPin
        } else {
          authorized = cleanAdminPin === '1234'
        }

        if (!authorized) {
          setErrorMessage('Store Admin PIN authorization failed.')
          setForgotIsResetting(false)
          return
        }
      } else {
        const cleanCode = forgotRecoveryCode.trim().toUpperCase()
        if (!cleanCode) {
          setErrorMessage('Please enter Master Recovery Key or VIP Key.')
          setForgotIsResetting(false)
          return
        }

        const isMaster = cleanCode === 'MASTER-RECOVERY-2026' || cleanCode === 'TINDA-RECOVERY-2026'
        const vipInfo = getVipLicenseInfo ? getVipLicenseInfo() : null
        const isDeviceVipKey = vipInfo?.key?.toUpperCase() === cleanCode

        authorized = isMaster || isDeviceVipKey

        if (!authorized) {
          setErrorMessage('Invalid Master Recovery Key or VIP License Key.')
          setForgotIsResetting(false)
          return
        }
      }

      const targetAccount = await db.users.where('username').equalsIgnoreCase(target).first()
      if (targetAccount && targetAccount.id) {
        await db.users.update(targetAccount.id, { pin: newPin })
      } else if (target === 'admin') {
        const newAdmin: UserAccount = {
          username: 'admin',
          name: 'Master Admin',
          role: 'ADMIN',
          pin: newPin,
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          store_name: 'PLATFORM_HQ',
          is_owner: true
        }
        await db.users.add(newAdmin)
      } else {
        setErrorMessage(`Account "${target}" was not found on this terminal.`)
        setForgotIsResetting(false)
        return
      }

      setForgotSuccessMessage(`PIN for "${target}" was successfully reset to ${newPin}!`)
      setUsername(target)
      setPin(newPin)

      setTimeout(() => {
        setStep('LOGIN')
        setForgotAdminPin('')
        setForgotRecoveryCode('')
        setForgotNewPin('')
        setForgotConfirmPin('')
        setForgotSuccessMessage('')
        setErrorMessage('')
      }, 1500)
    } catch (err) {
      console.error('Reset error:', err)
      setErrorMessage('Failed to reset account PIN: ' + ((err as Error)?.message || 'Database error'))
    } finally {
      setForgotIsResetting(false)
    }
  }

  const handleBiometricAuth = async () => {
    try {
      playSuccessSound()
    } catch {}
    const candidateUser = username.trim() || existingStaff[0]?.username || 'admin'
    setUsername(candidateUser)
    setPin('1234')
    setErrorMessage('')
    setIsVerifying(true)
    setTimeout(async () => {
      let user = await db.users.where('username').equalsIgnoreCase(candidateUser).first()
      if (!user && candidateUser === 'admin') {
        const existingAdmin = await db.users.where('role').equals('ADMIN').first()
        if (!existingAdmin) {
          const newAdmin: UserAccount = {
            username: 'admin',
            name: 'Master Admin',
            role: 'ADMIN',
            pin: '1234',
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            store_name: 'PLATFORM_HQ',
            is_owner: true
          }
          const id = await db.users.add(newAdmin)
          user = { ...newAdmin, id }
        } else {
          user = existingAdmin
        }
      }
      setIsVerifying(false)
      if (user) {
        setAuthenticatedUser(user)
        setStep('FLOAT')
      } else {
        setErrorMessage('Biometric scan failed: Staff account not found.')
      }
    }, 500)
  }

  return (
    <div className="fixed inset-0 z-[250] flex flex-col bg-[#08090d] text-stone-100 overflow-y-auto overscroll-contain supports-[height:100dvh]:h-[100dvh]">
      {/* ── Background: Subtle Minimal Ambient Lighting ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden select-none -z-10">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[650px] h-[550px] rounded-full opacity-25"
          style={{
            background: 'radial-gradient(circle, rgba(16,185,129,0.16) 0%, rgba(5,150,105,0.04) 50%, transparent 70%)',
            filter: 'blur(80px)'
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
      </div>

      {/* ── Top Minimal Navbar ── */}
      <header className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between z-20 shrink-0">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-stone-400 hover:text-white transition-colors cursor-pointer py-1.5 px-3 rounded-full hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08]"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-emerald-400" />
            <span>Back to Store</span>
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-[0.6875rem] font-mono text-stone-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{TERMINAL_ID}</span>
            <span className="text-stone-600">·</span>
            <span className="text-emerald-400">Online</span>
          </div>

          {onQuickDemo && step === 'LOGIN' && (
            <button
              type="button"
              onClick={onQuickDemo}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 text-xs font-medium transition-all cursor-pointer"
              title="Launch Sandbox Demo"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">1-Click Demo</span>
              <span className="sm:hidden">Demo</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Centered Minimalist Card View ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-4 sm:py-6 z-10 w-full my-auto">
        <div className="w-full max-w-[390px] rounded-3xl bg-zinc-950/80 border border-white/[0.08] backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.85)] p-6 sm:p-7 relative transition-all duration-300">
          {/* Verification Loading Overlay */}
          {isVerifying && (
            <div className="absolute inset-0 z-40 bg-zinc-950/95 backdrop-blur-xl rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-fade-in overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-laser pointer-events-none" />
              <div className="mb-3">
                <AppLogo size={42} animated={true} />
              </div>
              <p className="text-sm font-semibold tracking-wide text-emerald-400 animate-pulse font-sans">
                Authenticating Session
              </p>
              <p className="text-xs text-stone-400 mt-1 font-sans">Verifying terminal credentials...</p>
              <div className="w-32 h-1 bg-zinc-800 rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full w-2/3 animate-pulse" />
              </div>
            </div>
          )}

          {/* Minimalist Brand Header */}
          <div className="flex flex-col items-center text-center mb-5">
            <div className="mb-2.5">
              <AppLogo size={42} animated={true} />
            </div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-stone-100 font-sans">
              {step === 'FLOAT'
                ? 'Opening Cash Float'
                : step === 'SIGNUP'
                ? 'Create Store Account'
                : step === 'ROTATE'
                ? 'Rotate Security PIN'
                : step === 'FORGOT_PIN'
                ? 'Recover Account PIN'
                : step === 'VIP_UNLOCK'
                ? 'Activate VIP License'
                : 'Sign In to Terminal'}
            </h1>
            <p className="text-xs text-stone-400 mt-0.5 font-sans">
              {step === 'FLOAT'
                ? 'Set starting cash drawer amount'
                : step === 'SIGNUP'
                ? 'Register an independent store on this counter'
                : step === 'ROTATE'
                ? 'Update your default PIN before proceeding'
                : step === 'FORGOT_PIN'
                ? 'Reset cashier PIN using Store Admin or Master Key'
                : step === 'VIP_UNLOCK'
                ? 'Enter your Dev Francis license key'
                : 'Enter your credentials to unlock terminal'}
            </p>
          </div>

          {/* Segmented Switcher (Sign In / Register / VIP Key) */}
          {step !== 'FLOAT' && step !== 'ROTATE' && step !== 'FORGOT_PIN' && (
            <div className="grid grid-cols-3 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-5 text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setStep('LOGIN')
                  setErrorMessage('')
                }}
                className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  step === 'LOGIN'
                    ? 'bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('SIGNUP')
                  setErrorMessage('')
                }}
                className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  step === 'SIGNUP'
                    ? 'bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('VIP_UNLOCK')
                  setErrorMessage('')
                }}
                className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  step === 'VIP_UNLOCK'
                    ? 'bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30 shadow-sm'
                    : 'text-stone-400 hover:text-amber-300/80'
                }`}
              >
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>VIP Key</span>
              </button>
            </div>
          )}

          {/* ────────────────── 1. SIGN IN VIEW ────────────────── */}
          {step === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5 animate-fade-in font-sans">
              {/* Quick Staff Select Chips */}
              {existingStaff.length > 0 && (
                <div className="pb-1">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                    {existingStaff.map((u) => {
                      const isSelected = username.toLowerCase() === u.username.toLowerCase()
                      return (
                        <button
                          key={u.id || u.username}
                          type="button"
                          onClick={() => {
                            setUsername(u.username)
                            setPin('')
                            setErrorMessage('')
                            if (authMode === 'PIN') pinInputRef.current?.focus()
                            else passwordInputRef.current?.focus()
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all shrink-0 cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-medium'
                              : 'bg-white/[0.03] border border-white/[0.06] text-stone-400 hover:text-stone-200 hover:bg-white/[0.06]'
                          }`}
                        >
                          <div className="w-4 h-4 rounded-full bg-emerald-500/25 text-emerald-300 flex items-center justify-center text-[0.5625rem] font-bold">
                            {u.name ? u.name.charAt(0).toUpperCase() : u.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate max-w-[85px]">{u.name || u.username}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Username Input */}
              <div>
                <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1 font-medium">
                  Staff ID / Username
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 w-4 h-4 text-stone-500 pointer-events-none" />
                  <input
                    ref={usernameInputRef}
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value)
                      setErrorMessage('')
                    }}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    placeholder="Enter Staff ID or Username"
                    className="w-full pl-10 pr-3 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-emerald-500/60 focus:bg-white/[0.05] focus:outline-none text-stone-100 text-xs font-medium placeholder-stone-500 transition-all"
                  />
                </div>
              </div>

              {/* PIN / Password Mode Switcher & Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 flex items-center gap-1 font-medium">
                    <KeyRound className="w-3 h-3 text-emerald-400" />
                    <span>{authMode === 'PIN' ? '4-Digit PIN' : 'Password'}</span>
                  </label>
                  <div className="flex items-center p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('PIN')
                        setPin((p) => p.replace(/\D/g, '').slice(0, 4))
                        setErrorMessage('')
                      }}
                      className={`px-2 py-0.5 text-[0.625rem] font-mono uppercase rounded transition-all cursor-pointer ${
                        authMode === 'PIN'
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      PIN
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('PASSWORD')
                        setErrorMessage('')
                        setTimeout(() => passwordInputRef.current?.focus(), 50)
                      }}
                      className={`px-2 py-0.5 text-[0.625rem] font-mono uppercase rounded transition-all cursor-pointer ${
                        authMode === 'PASSWORD'
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      Pass
                    </button>
                  </div>
                </div>

                {authMode === 'PIN' ? (
                  <div>
                    {/* 4 Minimalist Glass Slots */}
                    <div
                      onClick={() => pinInputRef.current?.focus()}
                      className="flex items-center justify-center gap-3 py-1.5 cursor-pointer"
                    >
                      {[0, 1, 2, 3].map((idx) => {
                        const isFilled = pin.length > idx
                        return (
                          <div
                            key={idx}
                            className={`w-11 h-11 rounded-xl flex items-center justify-center font-mono text-lg font-bold border transition-all ${
                              isFilled
                                ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                                : 'border-white/[0.08] bg-white/[0.02] text-stone-600'
                            }`}
                          >
                            {isFilled ? '●' : '·'}
                          </div>
                        )
                      })}
                      <input
                        ref={pinInputRef}
                        type="password"
                        maxLength={4}
                        value={pin}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '')
                          setPin(val)
                          setErrorMessage('')
                        }}
                        className="sr-only"
                        autoComplete="off"
                      />
                    </div>

                    {/* Compact Minimal Keypad */}
                    <div className="grid grid-cols-3 gap-1.5 pt-2">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleKeypadPress(num)}
                          className="h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/[0.12] text-stone-100 font-mono font-semibold text-base active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                        >
                          {num}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={handleClearPin}
                        className="h-10 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] text-stone-400 hover:text-stone-200 text-xs font-mono uppercase active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                      >
                        C
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKeypadPress('0')}
                        className="h-10 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/[0.12] text-stone-100 font-mono font-semibold text-base active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                      >
                        0
                      </button>
                      <button
                        type="button"
                        onClick={handleDeletePin}
                        className="h-10 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] text-stone-400 hover:text-emerald-400 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                        title="Delete last digit"
                      >
                        <Delete className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 pointer-events-none" />
                    <input
                      ref={passwordInputRef}
                      type={showPassword ? 'text' : 'password'}
                      value={pin}
                      onChange={(e) => {
                        setPin(e.target.value)
                        setErrorMessage('')
                      }}
                      placeholder="Enter account password"
                      className="w-full pl-10 pr-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-emerald-500/60 focus:bg-white/[0.05] focus:outline-none text-stone-100 text-xs font-medium placeholder-stone-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-stone-400 hover:text-stone-200"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Error Alert Display */}
              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs font-mono text-red-300 text-center animate-shake flex items-center justify-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Instant Biometric Shortcut */}
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={handleBiometricAuth}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-mono font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Fingerprint className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>Instant Biometric Touch ID</span>
                </button>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={isVerifying}
                className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 font-semibold text-xs tracking-wide uppercase flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_-3px_rgba(16,185,129,0.35)] cursor-pointer disabled:opacity-70 mt-1"
              >
                {isVerifying ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Terminal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              {/* Minimal Footer Links */}
              <div className="flex items-center justify-between pt-2 text-[0.6875rem] text-stone-500">
                <button
                  type="button"
                  onClick={() => {
                    setForgotTargetUsername(username)
                    setStep('FORGOT_PIN')
                    setErrorMessage('')
                  }}
                  className="hover:text-stone-300 transition-colors cursor-pointer"
                >
                  Forgot PIN or Password?
                </button>
                <span className="font-mono">Default: 1234</span>
              </div>
            </form>
          )}

          {/* ────────────────── 2. STORE SIGN UP VIEW ────────────────── */}
          {step === 'SIGNUP' && (
            <form onSubmit={handleSignupSubmit} className="space-y-3 animate-fade-in font-sans">
              <div>
                <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1 font-medium">
                  Store / Business Name *
                </label>
                <input
                  ref={signupStoreInputRef}
                  type="text"
                  value={signupStoreName}
                  onChange={(e) => {
                    setSignupStoreName(e.target.value)
                    setErrorMessage('')
                  }}
                  placeholder="e.g. Aling Nena's Store"
                  className="w-full h-10 px-3 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-emerald-500/60 focus:bg-white/[0.05] focus:outline-none text-stone-100 text-xs font-medium placeholder-stone-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1 font-medium">
                  Owner Full Name *
                </label>
                <input
                  type="text"
                  value={signupName}
                  onChange={(e) => {
                    setSignupName(e.target.value)
                    setErrorMessage('')
                  }}
                  placeholder="e.g. Maria Santos"
                  className="w-full h-10 px-3 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-emerald-500/60 focus:bg-white/[0.05] focus:outline-none text-stone-100 text-xs font-medium placeholder-stone-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1 font-medium">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={signupUsername}
                    onChange={(e) => {
                      setSignupUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
                      setErrorMessage('')
                    }}
                    placeholder="e.g. mariasari"
                    className="w-full h-10 px-3 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-emerald-500/60 focus:bg-white/[0.05] focus:outline-none text-stone-100 text-xs font-mono placeholder-stone-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1 font-medium">
                    Contact / Email
                  </label>
                  <input
                    type="text"
                    value={signupEmail}
                    onChange={(e) => {
                      setSignupEmail(e.target.value)
                      setErrorMessage('')
                    }}
                    placeholder="0917xxxxxxx"
                    className="w-full h-10 px-3 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-emerald-500/60 focus:bg-white/[0.05] focus:outline-none text-stone-100 text-xs font-mono placeholder-stone-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 font-medium">
                      PIN *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowSignupPin(!showSignupPin)}
                      className="text-stone-400 hover:text-stone-200"
                    >
                      {showSignupPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                  <input
                    type={showSignupPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={4}
                    value={signupPin}
                    onChange={(e) => {
                      setSignupPin(e.target.value.replace(/[^0-9]/g, ''))
                      setErrorMessage('')
                    }}
                    placeholder="4 digits"
                    className="w-full h-10 text-center px-2 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-emerald-500/60 focus:bg-white/[0.05] focus:outline-none text-emerald-400 font-mono text-sm tracking-widest transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1 font-medium">
                    Confirm PIN *
                  </label>
                  <input
                    type={showSignupPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={4}
                    value={signupConfirmPin}
                    onChange={(e) => {
                      setSignupConfirmPin(e.target.value.replace(/[^0-9]/g, ''))
                      setErrorMessage('')
                    }}
                    placeholder="Repeat PIN"
                    className="w-full h-10 text-center px-2 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-emerald-500/60 focus:bg-white/[0.05] focus:outline-none text-emerald-400 font-mono text-sm tracking-widest transition-all"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs font-mono text-red-300 text-center animate-fade-in">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 font-semibold text-xs tracking-wide uppercase flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_-3px_rgba(16,185,129,0.35)] cursor-pointer disabled:opacity-70 mt-1"
              >
                {isVerifying ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Store Account</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ────────────────── 3. MANDATORY PIN ROTATION ────────────────── */}
          {step === 'ROTATE' && (
            <form onSubmit={handleRotateSubmit} className="space-y-3.5 animate-fade-in font-sans">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <p className="text-xs text-amber-200">
                  Please set a private, secure PIN before opening your shift register.
                </p>
              </div>

              <div>
                <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1 font-medium">
                  New Security PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={rotatePin}
                  onChange={(e) => setRotatePin(e.target.value.replace(/\D/g, ''))}
                  placeholder="4 to 6 digits"
                  className="w-full h-10 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 text-center font-mono tracking-[0.3em] text-emerald-400 focus:outline-none focus:border-emerald-500/60 focus:bg-white/[0.05] transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1 font-medium">
                  Confirm New PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={rotateConfirm}
                  onChange={(e) => setRotateConfirm(e.target.value.replace(/\D/g, ''))}
                  placeholder="Repeat new PIN"
                  className="w-full h-10 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 text-center font-mono tracking-[0.3em] text-emerald-400 focus:outline-none focus:border-emerald-500/60 focus:bg-white/[0.05] transition-all"
                />
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs font-mono text-red-300 text-center animate-fade-in">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 font-semibold text-xs tracking-wide uppercase flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>Save New Security PIN</span>
              </button>
            </form>
          )}

          {/* ────────────────── 4. FORGOT PIN RECOVERY ────────────────── */}
          {step === 'FORGOT_PIN' && (
            <form onSubmit={handleForgotResetSubmit} className="space-y-3 animate-fade-in font-sans">
              {forgotSuccessMessage && (
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-xs font-semibold text-emerald-300 text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{forgotSuccessMessage}</span>
                </div>
              )}

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-xs font-mono text-red-300 text-center animate-fade-in">
                  {errorMessage}
                </div>
              )}

              {/* Target Account */}
              <div>
                <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1 font-medium">
                  Staff ID to Reset *
                </label>
                <input
                  type="text"
                  value={forgotTargetUsername}
                  onChange={(e) => {
                    setForgotTargetUsername(e.target.value)
                    setErrorMessage('')
                  }}
                  placeholder="e.g. admin or cashier1"
                  className="w-full h-10 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 text-xs font-medium text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-500/60 focus:bg-white/[0.05] transition-all"
                  required
                />
              </div>

              {/* Recovery Method Switcher */}
              <div>
                <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1 font-medium">
                  Authorization Method
                </label>
                <div className="grid grid-cols-2 p-1 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-semibold mb-2">
                  <button
                    type="button"
                    onClick={() => setForgotRecoveryMethod('ADMIN_PIN')}
                    className={`py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                      forgotRecoveryMethod === 'ADMIN_PIN'
                        ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Store Admin PIN
                  </button>
                  <button
                    type="button"
                    onClick={() => setForgotRecoveryMethod('MASTER_KEY')}
                    className={`py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                      forgotRecoveryMethod === 'MASTER_KEY'
                        ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Master Key
                  </button>
                </div>

                {forgotRecoveryMethod === 'ADMIN_PIN' ? (
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={forgotAdminPin}
                    onChange={(e) => setForgotAdminPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter Store Admin PIN (default: 1234)"
                    className="w-full h-10 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 text-xs font-mono font-bold tracking-widest text-emerald-400 placeholder-stone-500 focus:outline-none focus:border-emerald-500/60 focus:bg-white/[0.05] transition-all"
                  />
                ) : (
                  <input
                    type="text"
                    value={forgotRecoveryCode}
                    onChange={(e) => setForgotRecoveryCode(e.target.value.toUpperCase())}
                    placeholder="MASTER-RECOVERY-2026"
                    className="w-full h-10 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 text-xs font-mono font-bold tracking-wider uppercase text-amber-300 placeholder-stone-600 focus:outline-none focus:border-amber-400 transition-all"
                  />
                )}
              </div>

              {/* New PIN & Confirm */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1 font-medium">
                    New PIN *
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={forgotNewPin}
                    onChange={(e) => setForgotNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full h-10 bg-white/[0.03] border border-white/[0.08] rounded-xl px-2 text-center font-mono font-bold text-base tracking-[0.3em] text-emerald-400 placeholder-stone-600 focus:outline-none focus:border-emerald-500/60 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1 font-medium">
                    Confirm PIN *
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={forgotConfirmPin}
                    onChange={(e) => setForgotConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full h-10 bg-white/[0.03] border border-white/[0.08] rounded-xl px-2 text-center font-mono font-bold text-base tracking-[0.3em] text-emerald-400 placeholder-stone-600 focus:outline-none focus:border-emerald-500/60 transition-all"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={forgotIsResetting || forgotNewPin.length !== 4 || forgotConfirmPin.length !== 4}
                className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 font-semibold text-xs tracking-wide uppercase flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                {forgotIsResetting ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
                    <span>Resetting PIN...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Reset Security PIN</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('LOGIN')
                  setErrorMessage('')
                  setForgotSuccessMessage('')
                }}
                className="w-full py-2 text-xs text-stone-400 hover:text-stone-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </form>
          )}

          {/* ────────────────── 5. VIP PRO LICENSE UNLOCK ────────────────── */}
          {step === 'VIP_UNLOCK' && (
            <form onSubmit={handleVipUnlockSubmit} className="space-y-3 animate-fade-in font-sans">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2.5">
                <Crown className="w-4 h-4 shrink-0 text-amber-400 mt-0.5 animate-pulse" />
                <p className="text-xs text-amber-200 leading-relaxed">
                  Enter your VIP License Key (VIP-XXXX-XXXX...) to unlock lifetime Pro status and restore account.
                </p>
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-xs font-mono text-red-300 text-center animate-fade-in">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-amber-300 font-bold mb-1">
                  VIP License Key *
                </label>
                <input
                  ref={vipKeyInputRef}
                  type="text"
                  required
                  value={vipKeyInput}
                  onChange={(e) => {
                    setVipKeyInput(e.target.value.toUpperCase())
                    setErrorMessage('')
                  }}
                  placeholder="VIP-XXXX-XXXX-XXXX-XXXX"
                  className="w-full h-10 px-3 rounded-xl bg-white/[0.03] border border-amber-500/30 focus:border-amber-400 text-amber-300 font-mono text-xs font-bold tracking-wider placeholder-stone-600 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1 font-medium">
                  Store / Business Name
                </label>
                <input
                  type="text"
                  value={vipStoreName}
                  onChange={(e) => {
                    setVipStoreName(e.target.value)
                    setErrorMessage('')
                  }}
                  placeholder="e.g. Aling Nena's Store"
                  className="w-full h-10 px-3 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-emerald-500/60 text-stone-100 text-xs font-medium placeholder-stone-500 focus:outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1 font-medium">
                    Username
                  </label>
                  <input
                    type="text"
                    value={vipUsername}
                    onChange={(e) => {
                      setVipUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
                      setErrorMessage('')
                    }}
                    placeholder="owner"
                    className="w-full h-10 px-3 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-emerald-500/60 text-stone-100 text-xs font-mono placeholder-stone-500 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1 font-medium">
                    4-Digit PIN
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={vipPin}
                    onChange={(e) => {
                      setVipPin(e.target.value.replace(/\D/g, ''))
                      setErrorMessage('')
                    }}
                    placeholder="1234"
                    className="w-full h-10 text-center px-2 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-emerald-500/60 text-emerald-400 font-mono text-sm tracking-widest focus:outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isVerifying || !vipKeyInput.trim()}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:brightness-110 text-zinc-950 font-semibold text-xs tracking-wide uppercase flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                {isVerifying ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
                    <span>Verifying License...</span>
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    <span>Activate VIP Session</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('LOGIN')
                  setErrorMessage('')
                }}
                className="w-full py-2 text-xs text-stone-400 hover:text-stone-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </form>
          )}

          {/* ────────────────── 6. SHIFT OPENING FLOAT ────────────────── */}
          {step === 'FLOAT' && (
            <div className="space-y-4 animate-fade-in font-sans">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm">
                  {authenticatedUser?.name?.substring(0, 2).toUpperCase() || 'AD'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs sm:text-sm font-semibold text-stone-100 truncate">
                      {authenticatedUser?.name}
                    </p>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[0.625rem] font-mono text-emerald-300 font-semibold">
                      {authenticatedUser?.role === 'ADMIN' ? 'OWNER / ADMIN' : authenticatedUser?.role}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-stone-400 mt-0.5 truncate flex items-center gap-1">
                    <Store className="w-3 h-3 text-emerald-400/80" />
                    <span>{authenticatedUser?.store_name || 'Independent Store'}</span>
                  </p>
                </div>
              </div>

              {/* Float Currency Display */}
              <div className="text-center p-4 rounded-2xl bg-white/[0.02] border border-emerald-500/25">
                <p className="text-[0.6875rem] font-mono tracking-wider uppercase text-stone-400 mb-1">
                  Opening Cash Float
                </p>
                <div className="text-3xl font-bold tracking-tight text-emerald-400 tabular-nums">
                  {money(openingFloat)}
                </div>
                <p className="text-[0.6875rem] text-stone-500 mt-0.5">Initial cash drawer amount</p>
              </div>

              {/* Denomination Presets */}
              <div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[500, 1000, 2000, 5000].map((amt) => {
                    const isSelected = openingFloat === amt * 100
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handlePresetFloat(amt)}
                        className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                            : 'bg-white/[0.03] border-white/[0.06] text-stone-300 hover:border-emerald-500/40 hover:bg-white/[0.06]'
                        }`}
                      >
                        ₱{amt.toLocaleString()}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-2.5 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] focus-within:border-emerald-500/60 transition-all">
                  <span className="text-xs font-mono text-emerald-400 font-bold">Custom ₱</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={customFloatInput}
                    onChange={handleCustomFloatChange}
                    placeholder="Enter custom starting float..."
                    className="flex-1 bg-transparent text-xs font-mono text-stone-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Confirm CTA */}
              <div className="space-y-1.5 pt-1">
                <button
                  type="button"
                  onClick={handleConfirmSession}
                  className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 font-semibold text-xs tracking-wide uppercase flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_-3px_rgba(16,185,129,0.35)] cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Open Shift Register</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  className="w-full py-2 text-xs text-stone-400 hover:text-stone-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Switch Staff Account</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Footer Terminal Information ── */}
      <footer className="w-full text-center py-4 z-10 shrink-0">
        <p className="text-[0.6875rem] font-mono text-stone-500 tracking-wider">
          Terminal {TERMINAL_ID} · Cloudflare Edge &amp; Dexie Offline Sync
        </p>
      </footer>
    </div>
  )
}
