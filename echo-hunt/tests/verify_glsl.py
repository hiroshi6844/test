"""Optional Linux Mesa EGL check. Tests the actual GLSL and refraction path.
This is not a browser WebGL or iOS device test. No game runtime dependency.
"""
import ctypes as C
import json
import re
from pathlib import Path

egl=C.CDLL('libEGL.so.1')
egl.eglGetProcAddress.argtypes=[C.c_char_p]
egl.eglGetProcAddress.restype=C.c_void_p
def fn(name, result, args):
    address=egl.eglGetProcAddress(name.encode())
    if not address: raise RuntimeError('Missing GL function: '+name)
    return C.CFUNCTYPE(result,*args)(address)
I=C.c_int; U=C.c_uint; F=C.c_float; P=C.c_void_p
display=fn('eglGetPlatformDisplayEXT',P,[U,P,C.POINTER(I)])(0x31DD,None,None)
major=I();minor=I()
initialize=fn('eglInitialize',U,[P,C.POINTER(I),C.POINTER(I)])
assert initialize(display,C.byref(major),C.byref(minor))
assert fn('eglBindAPI',U,[U])(0x30A0)
attrs=(I*15)(0x3033,1,0x3040,4,0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3025,16,0x3038)
config=P();count=I()
assert fn('eglChooseConfig',U,[P,C.POINTER(I),C.POINTER(P),I,C.POINTER(I)])(display,attrs,C.byref(config),1,C.byref(count)) and count.value
surface=fn('eglCreatePbufferSurface',P,[P,P,C.POINTER(I)])(display,config,(I*5)(0x3057,128,0x3056,128,0x3038))
context=fn('eglCreateContext',P,[P,P,P,C.POINTER(I)])(display,config,None,(I*3)(0x3098,2,0x3038))
assert surface and context
assert fn('eglMakeCurrent',U,[P,P,P,P])(display,surface,surface,context)
text=(Path(__file__).resolve().parent.parent/'renderer.mjs').read_text()
create=fn('glCreateShader',U,[U]);source=fn('glShaderSource',None,[U,I,C.POINTER(C.c_char_p),C.POINTER(I)])
compile_shader=fn('glCompileShader',None,[U]);get_shader=fn('glGetShaderiv',None,[U,U,C.POINTER(I)])
shaders=[]
for name,kind in [('VS',0x8B31),('FS',0x8B30)]:
    code=re.search(r'const '+name+r'=`(.*?)`;',text,re.S).group(1).encode()
    shader=create(kind);source(shader,1,C.byref(C.c_char_p(code)),None);compile_shader(shader)
    ok=I();get_shader(shader,0x8B81,C.byref(ok))
    if not ok.value:
        log=C.create_string_buffer(4096)
        fn('glGetShaderInfoLog',None,[U,I,C.POINTER(I),C.c_char_p])(shader,4096,None,log)
        raise RuntimeError(log.value.decode())
    shaders.append(shader)
program=fn('glCreateProgram',U,[])()
for shader in shaders:fn('glAttachShader',None,[U,U])(program,shader)
fn('glLinkProgram',None,[U])(program)
ok=I();fn('glGetProgramiv',None,[U,U,C.POINTER(I)])(program,0x8B82,C.byref(ok));assert ok.value
fn('glUseProgram',None,[U])(program)
location=fn('glGetUniformLocation',I,[U,C.c_char_p])
uniform1=fn('glUniform1f',None,[I,F]);uniform2=fn('glUniform2f',None,[I,F,F]);uniform3=fn('glUniform3f',None,[I,F,F,F])
fn('glUniformMatrix4fv',None,[I,I,U,C.POINTER(F)])(location(program,b'uVP'),1,0,(F*16)(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1))
uniform3(location(program,b'uEye'),0,0,2);uniform3(location(program,b'uForward'),0,0,-1)
uniform2(location(program,b'uResolution'),128,128)
for key in ['uGhost','uNight','uFlash','uHands','uTime']:uniform1(location(program,key.encode()),0)
values=[]
for x,y in [(-.7,-.7),(.7,-.7),(0,.7)]:values.extend([x,y,0,0,0,1,.4,.7,.9])
vertices=(F*len(values))(*values)
buffer=U();fn('glGenBuffers',None,[I,C.POINTER(U)])(1,C.byref(buffer))
fn('glBindBuffer',None,[U,U])(0x8892,buffer)
fn('glBufferData',None,[U,C.c_ssize_t,P,U])(0x8892,C.sizeof(vertices),vertices,0x88E4)
for key,offset in [('aPosition',0),('aNormal',12),('aColor',24)]:
    attr=fn('glGetAttribLocation',I,[U,C.c_char_p])(program,key.encode())
    fn('glEnableVertexAttribArray',None,[U])(attr)
    fn('glVertexAttribPointer',None,[U,I,U,U,I,P])(attr,3,0x1406,0,36,P(offset))
texture=U();fn('glGenTextures',None,[I,C.POINTER(U)])(1,C.byref(texture))
fn('glBindTexture',None,[U,U])(0x0DE1,texture)
for key,value in [(0x2801,0x2601),(0x2800,0x2601),(0x2802,0x812F),(0x2803,0x812F)]:fn('glTexParameteri',None,[U,U,I])(0x0DE1,key,value)
fn('glTexImage2D',None,[U,I,I,I,I,I,U,U,P])(0x0DE1,0,0x1907,128,128,0,0x1907,0x1401,None)
fn('glUniform1i',None,[I,I])(location(program,b'uScene'),0)
fn('glViewport',None,[I,I,I,I])(0,0,128,128)
fn('glClearColor',None,[F,F,F,F])(.05,.09,.13,1)
clear=fn('glClear',None,[U]);draw=fn('glDrawArrays',None,[U,I,I]);error=fn('glGetError',U,[])
def read():
    pixels=(C.c_ubyte*(128*128*4))()
    fn('glReadPixels',None,[I,I,I,I,U,U,P])(0,0,128,128,0x1908,0x1401,pixels)
    assert error()==0
    return bytes(pixels)
clear(0x4000);draw(4,0,3);base=read()
colors={base[i:i+3] for i in range(0,len(base),4)}
assert len(colors)>2, 'Single-color render'
fn('glCopyTexSubImage2D',None,[U,I,I,I,I,I,I,I])(0x0DE1,0,0,0,0,0,128,128)
captures=[]
for opacity in [.08,.76,.93]:
    uniform1(location(program,b'uGhost'),opacity);clear(0x4000);draw(4,0,3);captures.append(read())
assert captures[0]!=captures[1]!=captures[2], 'Opacity path did not change pixels'
version=fn('glGetString',C.c_char_p,[U])(0x1F02).decode()
print(json.dumps({'shader_compile':'PASS','program_link':'PASS','rasterization':'PASS','refraction_texture_copy':'PASS','opacity_states':3,'colors':len(colors),'gl_version':version}))
fn('eglMakeCurrent',U,[P,P,P,P])(display,None,None,None)
fn('eglDestroyContext',U,[P,P])(display,context)
fn('eglDestroySurface',U,[P,P])(display,surface)
fn('eglTerminate',U,[P])(display)
