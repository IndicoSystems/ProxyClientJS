import { shaString } from './sha'
import { ArgsAsTuple } from 'simplytyped'

it('should return correct sha256 for string', () => {
  const tests: Array<
    {
      source: string
      want: string
    } & ArgsAsTuple<typeof shaString>[1]
  > = [
    {
      source: 'abc',
      want: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    },
    {
      source: '(@#*^%$weoit@#(*%^wlkhasto*i^wetl@#kh%swdo*^%%@#ljnsdfgos^%',
      want: '38e963acdb7d13197613b74b99ac72fc6c1ade0d336604fc782962368ce41618',
    },
    {
      source: 'abc',
      want: '900150983cd24fb0d6963f7d28e17f72',
      hashType: 'md5',
    },
    {
      source: 'abc',
      want: 'kAFQmDzST7DWlj99KOF/cg==',
      hashType: 'md5',
      encoding: 'base64',
    },
  ]
  for (const { source, want, ...args } of tests) {
    expect(shaString(source, args)).toBe(want)
  }
})
