import { css } from '@emotion/react'
import styled from '@emotion/styled'

import type { Theme } from '@emotion/react'

export const Container = styled.div<{
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  noPadding?: boolean
}>`
  width: 100%;
  margin: 0 auto;

  ${({ theme, noPadding }) =>
    !noPadding &&
    css`
      padding: 0 ${theme.spacing[4]};

      /* stylelint-disable-next-line media-query-no-invalid */
      @media (width > ${theme.breakpoints.md}) {
        padding: 0 ${theme.spacing[6]};
      }

      /* stylelint-disable-next-line media-query-no-invalid */
      @media (width > ${theme.breakpoints.lg}) {
        padding: 0 ${theme.spacing[8]};
      }
    `}

  ${({ theme, maxWidth }) => {
    const widths = {
      sm: theme.breakpoints.sm,
      md: theme.breakpoints.md,
      lg: theme.breakpoints.lg,
      xl: theme.breakpoints.xl,
      '2xl': theme.breakpoints['2xl'],
      full: '100%',
    }
    const width = widths[maxWidth || 'xl']
    return width !== '100%'
      ? css`
          max-width: ${width};
        `
      : ''
  }}
`

export const Grid = styled.div<{
  cols?: number
  gap?: keyof Theme['spacing']
  responsive?: boolean
}>`
  display: grid;
  grid-template-columns: repeat(${({ cols }) => cols || 1}, 1fr);
  gap: ${({ theme, gap }) => theme.spacing[gap || 4]};
  width: 100%;

  ${({ responsive, theme, cols }) =>
    responsive &&
    css`
      /* stylelint-disable-next-line media-query-no-invalid */
      @media (width <= ${theme.breakpoints.sm}) {
        grid-template-columns: repeat(1, 1fr);
      }

      /* stylelint-disable-next-line media-query-no-invalid */
      @media (width > ${theme.breakpoints.sm}) and (width <= ${
          theme.breakpoints.md
        }) {
        grid-template-columns: repeat(2, 1fr);
      }

      /* stylelint-disable-next-line media-query-no-invalid */
      @media (width > ${theme.breakpoints.md}) and (width <= ${
          theme.breakpoints.lg
        }) {
        grid-template-columns: repeat(3, 1fr);
      }

      /* stylelint-disable-next-line media-query-no-invalid */
      @media (width > ${theme.breakpoints.lg}) {
        grid-template-columns: repeat(${cols || 4}, 1fr);
      }
    `}
`

export const Flex = styled.div<{
  direction?: 'row' | 'column'
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  gap?: keyof Theme['spacing']
  wrap?: boolean
}>`
  display: flex;
  flex-flow: ${({ direction }) => direction || 'row'};
  flex-wrap: ${({ wrap }) => (wrap ? 'wrap' : 'nowrap')};
  gap: ${({ theme, gap }) => theme.spacing[gap || 0]};
  align-items: ${({ align }) => {
    const alignMap = {
      start: 'flex-start',
      center: 'center',
      end: 'flex-end',
      stretch: 'stretch',
    }
    return alignMap[align || 'start']
  }};
  justify-content: ${({ justify }) => {
    const justifyMap = {
      start: 'flex-start',
      center: 'center',
      end: 'flex-end',
      between: 'space-between',
      around: 'space-around',
      evenly: 'space-evenly',
    }
    return justifyMap[justify || 'start']
  }};
`

export const Stack = styled(Flex)`
  flex-direction: column;
  width: 100%;
`

export const Divider = styled.div<{
  vertical?: boolean
  spacing?: keyof Theme['spacing']
}>`
  background-color: ${({ theme }) => theme.colors.gray['200']};

  ${({ vertical, theme, spacing }) =>
    vertical
      ? css`
          width: 1px;
          height: 100%;
          margin: 0 ${theme.spacing[spacing || 4]};
        `
      : css`
          width: 100%;
          height: 1px;
          margin: ${theme.spacing[spacing || 4]} 0;
        `}
`

export const Spacer = styled.div<{
  size?: keyof Theme['spacing']
}>`
  flex: 1;
  ${({ size, theme }) =>
    size &&
    css`
      flex: none;
      width: ${theme.spacing[size]};
      height: ${theme.spacing[size]};
    `}
`
