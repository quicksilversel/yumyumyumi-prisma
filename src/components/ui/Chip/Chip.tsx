import { css } from '@emotion/react'
import styled from '@emotion/styled'

import type { Theme } from '@emotion/react'

const chipStyles = ({
  variant,
  selected,
  theme,
}: {
  variant: 'filled' | 'outlined' | 'accent'
  selected: boolean
  theme: Theme
}) => {
  switch (variant) {
    case 'outlined':
      return css`
        color: ${selected ? theme.colors.black : theme.colors.gray[700]};
        background-color: transparent;
        border: 1px solid
          ${selected ? theme.colors.black : theme.colors.gray[300]};
      `
    case 'accent':
      return css`
        color: ${theme.colors.white};
        background-color: ${theme.colors.primary};
      `
    default:
      return css`
        color: ${selected ? theme.colors.white : theme.colors.gray[700]};
        background-color: ${
          selected ? theme.colors.black : theme.colors.gray[100]
        };
        border: 1px solid transparent;
      `
  }
}

export const Chip = styled.span<{
  variant?: 'filled' | 'outlined' | 'accent'
  size?: 'sm' | 'md'
  clickable?: boolean
  selected?: boolean
}>`
  display: inline-flex;
  gap: ${({ theme }) => theme.spacing[1]};
  align-items: center;
  font-weight: ${(props) => props.theme.typography.fontWeight.semibold};
  white-space: nowrap;
  user-select: none;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  transition: opacity ${({ theme }) => theme.transition.default};

  ${({ variant, selected, theme }) =>
    chipStyles({ variant: variant ?? 'filled', selected: !!selected, theme })}

  ${({ size, theme }) =>
    size === 'sm'
      ? css`
          padding: ${theme.spacing[1]} ${theme.spacing[2]};
          font-size: ${theme.typography.fontSize.xs};
        `
      : css`
          padding: ${theme.spacing[2]} ${theme.spacing[3]};
          font-size: ${theme.typography.fontSize.sm};
        `}

  ${({ clickable }) =>
    clickable &&
    css`
      cursor: pointer;

      &:hover,
      &:active {
        opacity: 0.8;
      }
    `}
`

export const ChipGroup = styled.div<{
  gap?: keyof Theme['spacing']
}>`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme, gap }) => theme.spacing[gap || 2]};
`
