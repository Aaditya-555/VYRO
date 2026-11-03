import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function VyroScene(){
  const host=useRef(null);
  useEffect(()=>{
    const root=host.current;
    if(!root)return;
    let renderer,frame=0,observer;
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(38,1,.1,100);
    camera.position.set(0,0,8.6);
    try{
      renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:"low-power"});
    }catch{return;}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));
    renderer.setSize(root.clientWidth||600,root.clientHeight||600,false);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.35;
    root.appendChild(renderer.domElement);

    const core=new THREE.Group();scene.add(core);
    const shell=new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.48,4),
      new THREE.MeshPhysicalMaterial({color:0x8f1737,metalness:.72,roughness:.2,transparent:true,opacity:.88,clearcoat:1,clearcoatRoughness:.12,wireframe:false})
    );core.add(shell);
    const wire=new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.53,2),
      new THREE.MeshBasicMaterial({color:0xff5678,wireframe:true,transparent:true,opacity:.23})
    );core.add(wire);
    const inner=new THREE.Mesh(
      new THREE.OctahedronGeometry(.83,2),
      new THREE.MeshStandardMaterial({color:0xff365d,metalness:.8,roughness:.18,emissive:0x5d0925,emissiveIntensity:1.2,flatShading:true})
    );core.add(inner);
    const ringMat=new THREE.MeshBasicMaterial({color:0xff5978,transparent:true,opacity:.7});
    const ring1=new THREE.Mesh(new THREE.TorusGeometry(2.05,.012,8,180),ringMat);
    ring1.rotation.set(.9,.2,.25);core.add(ring1);
    const ring2=new THREE.Mesh(new THREE.TorusGeometry(2.35,.006,8,180),new THREE.MeshBasicMaterial({color:0xff9aab,transparent:true,opacity:.38}));
    ring2.rotation.set(1.2,-.65,.5);core.add(ring2);
    const ring3=new THREE.Mesh(new THREE.TorusGeometry(1.78,.009,8,160),new THREE.MeshBasicMaterial({color:0x9e315c,transparent:true,opacity:.6}));
    ring3.rotation.set(.2,1.1,-.4);core.add(ring3);

    const count=850,positions=new Float32Array(count*3),sizes=new Float32Array(count);
    for(let i=0;i<count;i++){
      const radius=2.5+Math.random()*3.4,theta=Math.random()*Math.PI*2,phi=Math.acos(2*Math.random()-1);
      positions[i*3]=radius*Math.sin(phi)*Math.cos(theta);
      positions[i*3+1]=radius*Math.sin(phi)*Math.sin(theta);
      positions[i*3+2]=radius*Math.cos(phi);
      sizes[i]=Math.random();
    }
    const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute("position",new THREE.BufferAttribute(positions,3));
    const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xff829a,size:.018,transparent:true,opacity:.68,sizeAttenuation:true}));scene.add(dust);

    scene.add(new THREE.AmbientLight(0xffffff,.8));
    const key=new THREE.PointLight(0xff4569,48,18);key.position.set(3,3,4);scene.add(key);
    const fill=new THREE.PointLight(0x5b1738,34,16);fill.position.set(-4,-2,2);scene.add(fill);
    const rim=new THREE.PointLight(0xffb2c0,22,12);rim.position.set(0,4,-3);scene.add(rim);

    const resize=()=>{
      const w=Math.max(1,root.clientWidth),h=Math.max(1,root.clientHeight);
      renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
    };
    observer=new ResizeObserver(resize);observer.observe(root);resize();
    const clock=new THREE.Clock();
    const animate=()=>{
      frame=requestAnimationFrame(animate);
      const t=clock.getElapsedTime();
      core.rotation.y=t*.19;core.rotation.x=Math.sin(t*.24)*.12;
      inner.rotation.x=-t*.31;inner.rotation.y=t*.38;
      ring1.rotation.z=t*.12;ring2.rotation.y=t*-.1;ring3.rotation.x=t*.08;
      dust.rotation.y=t*.018;dust.rotation.x=Math.sin(t*.06)*.04;
      renderer.render(scene,camera);
    };
    animate();
    return()=>{
      cancelAnimationFrame(frame);observer?.disconnect();
      scene.traverse(o=>{o.geometry?.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});
      renderer.dispose();renderer.domElement.remove();
    };
  },[]);
  return <div className="vyro-three-scene" ref={host} aria-hidden="true"/>;
}
