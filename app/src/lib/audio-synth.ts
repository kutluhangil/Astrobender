/** Synthesizes deep space ambient drone and planetary radio waves using Web Audio API */
export class SpaceAudioSynth {
  private ctx: AudioContext | null = null
  private osc1: OscillatorNode | null = null
  private osc2: OscillatorNode | null = null
  private filter: BiquadFilterNode | null = null
  private gain: GainNode | null = null
  private isPlaying = false

  public toggle(): boolean {
    if (this.isPlaying) {
      this.stop()
      return false
    } else {
      this.start()
      return true
    }
  }

  public start() {
    if (this.isPlaying) return
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new AudioCtx()

      // Low frequency drone oscillator 1 (55 Hz - A1 note)
      this.osc1 = this.ctx.createOscillator()
      this.osc1.type = 'sine'
      this.osc1.frequency.setValueAtTime(55, this.ctx.currentTime)

      // Sub-drone oscillator 2 (110 Hz - A2 note with subtle detune)
      this.osc2 = this.ctx.createOscillator()
      this.osc2.type = 'triangle'
      this.osc2.frequency.setValueAtTime(110.5, this.ctx.currentTime)

      // Lowpass filter for warm cosmic ambient feel
      this.filter = this.ctx.createBiquadFilter()
      this.filter.type = 'lowpass'
      this.filter.frequency.setValueAtTime(220, this.ctx.currentTime)

      // Master Gain
      this.gain = this.ctx.createGain()
      this.gain.gain.setValueAtTime(0.12, this.ctx.currentTime)

      this.osc1.connect(this.filter)
      this.osc2.connect(this.filter)
      this.filter.connect(this.gain)
      this.gain.connect(this.ctx.destination)

      this.osc1.start()
      this.osc2.start()
      this.isPlaying = true
    } catch {
      this.isPlaying = false
    }
  }

  public stop() {
    if (!this.isPlaying) return
    try {
      this.osc1?.stop()
      this.osc2?.stop()
      this.ctx?.close()
    } catch {
      /* ignore */
    }
    this.isPlaying = false
  }

  public getPlaying(): boolean {
    return this.isPlaying
  }
}
