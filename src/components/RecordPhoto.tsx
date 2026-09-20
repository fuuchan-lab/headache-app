import { useEffect, useState } from 'react'
import { getPhoto } from '../db.ts'
import { useI18n } from '../i18n/useI18n.ts'

/** 端末に保存してある服薬の写真を表示する。className で履歴のサムネイルとポップアップの大きい表示を切り替える */
export function RecordPhoto({ id, className }: { id: string; className: string }) {
  const { t } = useI18n()
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    void getPhoto(id).then((p) => {
      if (p && !cancelled) {
        objectUrl = URL.createObjectURL(p.blob)
        setUrl(objectUrl)
      }
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id])
  return url ? <img className={className} src={url} alt={t('meds.photoAlt')} /> : null
}
