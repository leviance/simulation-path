import { canvasMaximumParticles, validateConfig, warmParticle, makeEmptySoA, writeParticle, readParticle, updateAoSRange, updateSoARange, particleChecksum, particleDifference, finiteParticle, type FountainConfig, type ParticleAoS, type ParticlesSoA, type MemoryWorkload } from "./state.ts";

export interface TimingStats { median: number; minimum: number; maximum: number; }
export interface BenchmarkRow {
  count: number;
  workload: MemoryWorkload;
  paired: boolean;
  updated: number;
  aos: TimingStats;
  soa: TimingStats;
  copyMs: number;
  conversionMs: number;
  checksumAoS: number;
  checksumSoA: number;
  maximumDifference: number;
}
export function summarizeTimes(samples: number[]): TimingStats {
  if (samples.length !== 5 || samples.some(value=>!Number.isFinite(value)||value<0)) throw new Error("Expected five finite timing samples");
  const sorted = [...samples].sort((a,b)=>a-b);
  return {median:sorted[2],minimum:sorted[0],maximum:sorted[4]};
}
export class FountainBenchmarkJob {
  active = true;
  paused = false;
  timedOut = false;
  config: FountainConfig;
  sizes: number[];
  workloads: MemoryWorkload[];
  paired: boolean;
  initial: ParticleAoS[] = [];
  workAoS: ParticleAoS[] = [];
  workSoA: ParticlesSoA = makeEmptySoA(0);
  rows: BenchmarkRow[] = [];
  row!: BenchmarkRow;
  aosTimes: number[] = [];
  soaTimes: number[] = [];
  phase: "prepare"|"reset"|"kernel"|"verify" = "prepare";
  caseIndex = 0;
  target = 0;
  sample = -1;
  trial = 0;
  method = 0;
  step = 0;
  trialUpdated = 0;
  kernelMs = 0;
  deadline: number;
  notice = "Đang chuẩn bị dữ liệu warm theo seed; chưa đo kernel.";
  constructor(config: FountainConfig, sizes: number[], workloads: MemoryWorkload[], paired = true, now = performance.now()) {
    validateConfig(config);
    if (!sizes.length || sizes.length>3 || sizes.some(n=>!Number.isInteger(n)||n<1||n>canvasMaximumParticles) || !workloads.length || workloads.length>2 || workloads.some(w=>w!=="gravity-only"&&w!=="full-lifecycle")) throw new Error("Canvas benchmark case budget");
    this.config = {...config};
    this.sizes = [...sizes];
    this.workloads = [...workloads];
    this.paired = paired;
    this.deadline = now + 30000;
    this.prepareCase();
  }
  prepareCase() {
    const count = this.sizes[Math.floor(this.caseIndex/this.workloads.length)];
    this.row = {count,workload:this.workloads[this.caseIndex%this.workloads.length],paired:this.paired,updated:0,aos:{median:0,minimum:0,maximum:0},soa:{median:0,minimum:0,maximum:0},copyMs:0,conversionMs:0,checksumAoS:0,checksumSoA:0,maximumDifference:0};
    this.initial = new Array<ParticleAoS>(count);
    this.workAoS = new Array<ParticleAoS>(count);
    this.workSoA = makeEmptySoA(this.paired?count:0);
    this.phase = "prepare";
    this.target = 0;
    this.sample = -1;
    this.trial = this.method = this.step = 0;
    this.aosTimes = [];
    this.soaTimes = [];
  }
  chooseMethod() {
    this.method = this.paired ? (this.trial + Math.max(0,this.sample)%2)%2 : 0;
    this.phase = "reset";
    this.target = this.step = this.trialUpdated = 0;
    this.kernelMs = 0;
    this.notice = "Dữ liệu tạo lại từ cùng source; copy/conversion nằm ngoài timer kernel.";
  }
  resetUnit(clock:()=>number) {
    const end = Math.min(this.row.count,this.target+512), started = clock();
    for(let index=this.target;index<end;index++) {
      if(this.method===0) this.workAoS[index]={...this.initial[index]};
      else writeParticle(this.workSoA,index,this.initial[index]);
    }
    if(this.sample===0) {
      if(this.method===0) this.row.copyMs += clock()-started;
      else this.row.conversionMs += clock()-started;
    }
    this.target = end;
    if(this.target===this.row.count) {this.target=0;this.phase="kernel";}
  }
  kernelUnit(clock:()=>number) {
    const end=Math.min(this.row.count,this.target+512),started=clock();
    if(this.method===0) updateAoSRange(this.workAoS,this.target,end,this.config,this.row.workload,this.row.count);
    else updateSoARange(this.workSoA,this.target,end,this.config,this.row.workload,this.row.count);
    this.kernelMs += clock()-started;
    this.trialUpdated += end-this.target;
    this.target=end;
    if(this.target<this.row.count) return;
    this.target=0;
    if(++this.step<3) return;
    if(this.trialUpdated!==this.row.count*3) throw new Error("Incomplete benchmark pass");
    this.row.updated=this.trialUpdated;
    if(this.sample>=0) (this.method===0?this.aosTimes:this.soaTimes).push(this.kernelMs);
    if(++this.trial<(this.paired?2:1)) this.chooseMethod();
    else {this.row.checksumAoS=this.row.checksumSoA=0;this.phase="verify";}
  }
  verifyUnit() {
    const end=Math.min(this.row.count,this.target+512);
    for(let index=this.target;index<end;index++) {
      const first=this.workAoS[index];
      if(first.id!==index||!finiteParticle(first)) throw new Error("AoS state validation failed");
      this.row.checksumAoS+=particleChecksum(first);
      if(this.paired) {
        const second=readParticle(this.workSoA,index);
        this.row.checksumSoA+=particleChecksum(second);
        this.row.maximumDifference=Math.max(this.row.maximumDifference,particleDifference(first,second));
      }
    }
    this.target=end;
    if(this.target<this.row.count) return;
    if(this.paired&&this.row.maximumDifference>1e-5) throw new Error("AoS/SoA state mismatch");
    this.target=this.trial=0;
    if(++this.sample<5) {this.chooseMethod();return;}
    this.row.aos=summarizeTimes(this.aosTimes);
    if(this.paired) this.row.soa=summarizeTimes(this.soaTimes);
    this.rows.push({...this.row});
    if(++this.caseIndex<this.sizes.length*this.workloads.length) this.prepareCase();
    else {this.active=false;this.notice="Đã đo đủ: 1 warm-up + 5 mẫu, mỗi mẫu ba pass đủ N; checksum đã kiểm.";}
  }
  tick(clock=()=>performance.now(),budget=5) {
    if(!this.active||this.paused) return;
    const until=clock()+budget;
    do {
      if(clock()>this.deadline) {this.active=false;this.timedOut=true;this.notice="Chưa hoàn tất: chạm giới hạn 30 giây (gồm thời gian pause).";return;}
      if(this.phase==="prepare") {
        const end=Math.min(this.row.count,this.target+512);
        for(let index=this.target;index<end;index++) this.initial[index]=warmParticle(index,this.config);
        this.target=end;
        if(this.target===this.row.count) this.chooseMethod();
      } else if(this.phase==="reset") this.resetUnit(clock);
      else if(this.phase==="kernel") this.kernelUnit(clock);
      else this.verifyUnit();
    }while(this.active&&clock()<until);
  }
  cancel() {this.active=false;this.notice="Đã hủy. Chỉ giữ các dòng đã hoàn tất, không xem đây là thí nghiệm hoàn chỉnh.";}
}
