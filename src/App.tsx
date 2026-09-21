import { lazy, Suspense, useState } from 'react'
import { Header } from './components/Header.tsx'
import { HeadacheForm } from './components/HeadacheForm.tsx'
import type { EditResult } from './components/MedicineEditor.tsx'
import { HistoryList } from './components/HistoryList.tsx'
import { MedicationForm } from './components/MedicationForm.tsx'
import { PressureCard } from './components/PressureCard.tsx'
import { SettingsPage } from './components/SettingsPage.tsx'
import { useGoogleAuth } from './hooks/useGoogleAuth.ts'
import { useI18n } from './i18n/useI18n.ts'
import { useOnline } from './hooks/useOnline.ts'
import { useMedicines } from './hooks/useMedicines.ts'
import { usePressure } from './hooks/usePressure.ts'
import { useRecords, type Snapshot } from './hooks/useRecords.ts'
import { useSync } from './hooks/useSync.ts'

// グラフの部品（recharts）は大きいので別ファイルに分け、画面の他の部分を先に表示する
const PressureChart = lazy(() => import('./components/PressureChart.tsx').then((m) => ({ default: m.PressureChart })))

export default function App() {
  const { t } = useI18n()
  const online = useOnline()
  const [view, setView] = useState<'home' | 'settings'>('home')
  const { records, unsyncedCount, reload, addHeadache, addMedication, logPressure, update, renameMedication, remove } =
    useRecords()
  const auth = useGoogleAuth()
  const {
    medicines,
    dirty: medicinesDirty,
    refresh: refreshMedicines,
    add: addMedicine,
    update: updateMedicineSetting,
    remove: removeMedicine,
    move: moveMedicine,
  } = useMedicines()
  const sync = useSync(auth.account !== null, unsyncedCount, medicinesDirty, reload, refreshMedicines)

  const pressure = usePressure((forecast, pos) => {
    void logPressure({ pressure: forecast.current, lat: pos.lat, lon: pos.lon })
  })

  /** 薬の名前・色を変える。名前を変えた時は、過去の記録の薬名も新しい名前にそろえる */
  const editMedicine = async (
    id: string,
    name: string,
    color: string,
    intervalHours: number | null,
  ): Promise<EditResult> => {
    const result = updateMedicineSetting(id, name, color, intervalHours)
    if (!result.ok) return result.reason === 'duplicate' ? 'duplicate' : 'empty'
    if (result.oldName !== result.newName) await renameMedication(result.oldName, result.newName)
    return 'ok'
  }

  const snapshot = (): Snapshot => ({
    pressure: pressure.forecast?.current ?? null,
    lat: pressure.position?.lat ?? null,
    lon: pressure.position?.lon ?? null,
  })

  return (
    <main className="app">
      <Header
        view={view}
        onToggleSettings={() => setView(view === 'home' ? 'settings' : 'home')}
        auth={auth}
        sync={sync}
        unsyncedCount={unsyncedCount}
      />

      {/* 電波がない場所でも記録できることを伝える。ネットにつながると自動で同期する */}
      {!online && (
        <p className="banner banner-info" role="status">
          📴 {t('offline.banner')}
        </p>
      )}

      {view === 'settings' ? (
        <SettingsPage
          medicines={medicines}
          onAdd={addMedicine}
          onEdit={editMedicine}
          onRemove={removeMedicine}
          onMove={moveMedicine}
          records={records}
          loggedIn={auth.account !== null}
        />
      ) : (
        <>
          <PressureCard pressure={pressure} records={records} medicines={medicines} />
          <HeadacheForm
            pressure={pressure.forecast?.current ?? null}
            onSave={(level, note, ts) => addHeadache(level, note, ts, snapshot())}
          />
          <MedicationForm
            medicines={medicines}
            onSave={(name, tablets, note, photo) => addMedication(name, tablets, note, photo, snapshot())}
          />
          <Suspense fallback={<section className="card chart-loading" aria-busy="true" />}>
            <PressureChart records={records} medicines={medicines} />
          </Suspense>
          <HistoryList records={records} medicines={medicines} onUpdate={update} onRemove={(r) => void remove(r)} />
        </>
      )}
    </main>
  )
}
