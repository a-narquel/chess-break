#!/usr/bin/env python3
"""Make puzzles from computer self-play: python3 tools/generate.py <seed> <games> > out.json

Each kept position has exactly one mating move (mate in 1) or exactly one
key move that mates against every defence (mate in 2), checked with
python-chess. This is how the first 682 puzzles were made."""
import chess, random, json, sys
random.seed(int(sys.argv[1]) if len(sys.argv)>1 else 1)
V={1:1,2:3,3:3,4:5,5:9,6:0}
def mat(b,c): return sum(V[p.piece_type] for p in b.piece_map().values() if p.color==c)
def mates1(b):
    r=[]
    for m in b.legal_moves:
        b.push(m)
        if b.is_checkmate(): r.append(m.uci())
        b.pop()
    return r
def is_mate_after_all(b):
    # side to move (defender): every reply allows mate in 1; returns None if no
    if b.is_game_over(): return None
    out={}
    for r in b.legal_moves:
        b.push(r); ms=mates1(b); b.pop()
        if not ms: return None
        out[r.uci()]=ms
    return out
def mate2(b):
    keys=[]
    for m in b.legal_moves:
        b.push(m)
        if not b.is_checkmate():
            o=is_mate_after_all(b)
            if o: keys.append((m.uci(),o))
        b.pop()
    return keys
def pick(b):
    ms=list(b.legal_moves)
    def sc(m):
        s=random.random()*2.5
        if b.is_capture(m):
            t=b.piece_at(m.to_square); s+= V[t.piece_type] if t else 1
            if b.is_attacked_by(not b.turn,m.to_square): s-=V[b.piece_at(m.from_square).piece_type]*0.8
        elif b.is_attacked_by(not b.turn,m.to_square) and not b.is_attacked_by(b.turn,m.to_square): s-=V[b.piece_at(m.from_square).piece_type]
        if b.gives_check(m): s+=0.6
        return s
    return max(ms,key=sc)
m1=[];m2=[]
seen=set()
for g in range(int(sys.argv[2]) if len(sys.argv)>2 else 300):
    b=chess.Board(); got1=got2=False
    for ply in range(160):
        if b.is_game_over(): break
        if ply>=16 and len(b.piece_map())>=9:
            fen=b.fen(); k=b.board_fen()
            if k not in seen:
                me,op=mat(b,b.turn),mat(b,not b.turn)
                if me-op<=4 and not b.is_check():
                    s1=mates1(b)
                    if len(s1)==1 and me-op<=2 and not got1:
                        seen.add(k); got1=True; m1.append({"fen":fen,"n":1,"a":s1})
                    elif not s1 and not got2:
                        ks=mate2(b)
                        if len(ks)==1:
                            key,o=ks[0]
                            # choose reply: fewest mating answers, prefer non-trivial
                            rep=min(o,key=lambda r:(len(o[r]),random.random()))
                            if len(o)>=2:
                                seen.add(k); got2=True; m2.append({"fen":fen,"n":2,"a":[key],"r":rep,"b":o[rep]})
        b.push(pick(b))
print(json.dumps({"m1":m1,"m2":m2}))
