'use client'

import { useEffect, useMemo, useState } from 'react'
import { Select } from '@/components/ui/Select'

type ResourceDownloadVersion = {
  id: string
  name: string
  number: string
  type: string
  gameVersions: string[]
  loaders: string[]
  datePublished: string
  fileName: string
  fileUrl: string
  fileSize: number | null
}

type ResourceDownloadButtonProps = {
  resourceName: string
  iconUrl: string
  versions: ResourceDownloadVersion[]
  fallbackDownloadUrl: string
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function sortVersions(values: string[]) {
  return [...values].sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }))
}

function sortLoaders(values: string[]) {
  const priority = ['fabric', 'forge', 'neoforge', 'quilt', 'babric', 'rift', 'liteloader']
  return [...values].sort((a, b) => {
    const aIndex = priority.indexOf(a.toLowerCase())
    const bIndex = priority.indexOf(b.toLowerCase())
    if (aIndex !== -1 || bIndex !== -1) {
      return (aIndex === -1 ? priority.length : aIndex) - (bIndex === -1 ? priority.length : bIndex)
    }
    return a.localeCompare(b)
  })
}

function findMatchingVersion(versions: ResourceDownloadVersion[], gameVersion: string, loader: string) {
  return versions.find((version) => version.gameVersions.includes(gameVersion) && version.loaders.includes(loader)) || versions[0] || null
}

export function ResourceDownloadButton({ resourceName, iconUrl, versions, fallbackDownloadUrl }: ResourceDownloadButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const loaderOptions = useMemo(() => sortLoaders(unique(versions.flatMap((version) => version.loaders))), [versions])
  const [selectedLoader, setSelectedLoader] = useState(loaderOptions[0] || '')

  const gameVersionOptions = useMemo(() => {
    const scopedVersions = unique(
      versions
        .filter((version) => !selectedLoader || version.loaders.includes(selectedLoader))
        .flatMap((version) => version.gameVersions),
    )
    return sortVersions(scopedVersions)
  }, [selectedLoader, versions])

  const [selectedGameVersion, setSelectedGameVersion] = useState(gameVersionOptions[0] || '')

  useEffect(() => {
    if (!selectedLoader && loaderOptions[0]) {
      setSelectedLoader(loaderOptions[0])
      return
    }
    if (selectedLoader && loaderOptions.length > 0 && !loaderOptions.includes(selectedLoader)) {
      setSelectedLoader(loaderOptions[0])
    }
  }, [loaderOptions, selectedLoader])

  useEffect(() => {
    if (!selectedGameVersion && gameVersionOptions[0]) {
      setSelectedGameVersion(gameVersionOptions[0])
      return
    }
    if (selectedGameVersion && gameVersionOptions.length > 0 && !gameVersionOptions.includes(selectedGameVersion)) {
      setSelectedGameVersion(gameVersionOptions[0])
    }
  }, [gameVersionOptions, selectedGameVersion])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen])

  if (versions.length === 0) {
    return (
      <a className="btn btn-primary resource-download-main" href={fallbackDownloadUrl} download target="_blank" rel="noopener noreferrer">
        ↓ Скачати
      </a>
    )
  }

  const selectedVersion = findMatchingVersion(versions, selectedGameVersion, selectedLoader)
  const downloadUrl = selectedVersion?.fileUrl || fallbackDownloadUrl

  return (
    <>
      <button type="button" className="btn btn-primary resource-download-main" onClick={() => setIsOpen(true)}>
        ↓ Скачати
      </button>

      {isOpen && (
        <div
          className="resource-download-modal"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false)
          }}
        >
          <section className="resource-download-dialog" role="dialog" aria-modal="true" aria-label={`Скачати ${resourceName}`}>
            <header className="resource-download-dialog-head">
              <span className="resource-download-dialog-icon">
                <img src={iconUrl} alt="" loading="lazy" decoding="async" />
              </span>
              <div>
                <h2>Скачати {resourceName}</h2>
                <p>Вибери loader і доступну для нього версію Minecraft.</p>
              </div>
              <button type="button" className="resource-download-close" onClick={() => setIsOpen(false)} aria-label="Закрити">
                ×
              </button>
            </header>

            <div className="resource-download-manual">
              <span />
              <b>Скачати вручну</b>
              <span />
            </div>

            <div className="resource-download-selects">
              <Select
                value={selectedLoader}
                onChange={setSelectedLoader}
                options={loaderOptions.map((loader) => ({ value: loader, label: loader }))}
                placeholder="Loader"
                ariaLabel="Loader"
                className="resource-download-select"
              />
              <Select
                value={selectedGameVersion}
                onChange={setSelectedGameVersion}
                options={gameVersionOptions.map((version) => ({ value: version, label: version }))}
                placeholder="Версія гри"
                ariaLabel="Версія Minecraft"
                className="resource-download-select"
              />
            </div>

            <a className="btn btn-primary btn-block resource-download-confirm" href={downloadUrl} download target="_blank" rel="noopener noreferrer">
              ↓ Скачати файл
            </a>

            {selectedVersion && (
              <p className="resource-download-file">
                {selectedVersion.name} · {selectedVersion.fileName}
              </p>
            )}
          </section>
        </div>
      )}
    </>
  )
}
