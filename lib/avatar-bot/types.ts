export type AvatarViewKey = 'bust' | 'full' | 'face' | 'front' | 'back' | 'frontfull'

export type AvatarSession = {
  readonly chatId: number
  readonly username: string | null
  readonly skinUrl: string | null
  readonly view: AvatarViewKey
  readonly updatedAt: number
}

export type TelegramUpdate = {
  update_id: number
  message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
}

export type TelegramMessage = {
  message_id: number
  chat: { id: number; type: string }
  text?: string
  document?: TelegramDocument
  photo?: TelegramPhotoSize[]
}

export type TelegramDocument = {
  file_id: string
  file_name?: string
  mime_type?: string
  file_size?: number
}

export type TelegramPhotoSize = {
  file_id: string
  width: number
  height: number
}

export type TelegramCallbackQuery = {
  id: string
  from: { id: number }
  message?: TelegramMessage
  data?: string
}

export type RenderAvatarInput = {
  view: AvatarViewKey
  username?: string | null
  skinUrl?: string | null
  size?: number
}
