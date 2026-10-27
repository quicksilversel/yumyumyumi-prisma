import { ArrowUpDown as SortIcon } from 'lucide-react'

import { Dropdown, type DropdownOption } from '@/components/ui/Dropdown'

export type SortOption =
  'date-desc' | 'date-asc' | 'alphabetical' | 'cooktime-asc' | 'cooktime-desc'

const SORT_OPTIONS: DropdownOption<SortOption>[] = [
  { label: '新しい順', value: 'date-desc' },
  { label: '古い順', value: 'date-asc' },
  { label: '名前順', value: 'alphabetical' },
  { label: '調理時間が短い順', value: 'cooktime-asc' },
  { label: '調理時間が長い順', value: 'cooktime-desc' },
]

type Props = {
  selectedSort: SortOption
  onSortChange: (sort: SortOption) => void
}

export const RecipeSortButton = ({ selectedSort, onSortChange }: Props) => {
  return (
    <Dropdown
      options={SORT_OPTIONS}
      selectedValue={selectedSort}
      onSelect={onSortChange}
      placeholder={selectedSort}
      hasPadding={false}
      icon={<SortIcon />}
    />
  )
}
